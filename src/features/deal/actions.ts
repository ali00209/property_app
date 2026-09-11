"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { moneyString } from "@/lib/utils";
import type {
  ActionResult,
  Deal,
  DealDetail,
} from "@/types";
import {
  createDealCore,
  amount,
  money,
  roundMoney,
  audit,
} from "./core";
import {
  dealFormSchema,
  paymentSchema,
  settlementSchema,
  type DealFormValues,
  type PaymentFormValues,
  type SettlementFormValues,
} from "./validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown): ActionResult<never> {
  const message =
    e instanceof Error && e.message
      ? e.message
      : "Something went wrong while processing the deal.";
  if (e && typeof e === "object" && "code" in e && e.code === "23505") {
    return errorResult("property already has an active deal");
  }
  return errorResult(message);
}

export async function createDealAction(
  values: DealFormValues,
): Promise<ActionResult<DealDetail>> {
  const actor = await requireRole("admin", "property_manager", "owner");
  const parsed = dealFormSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  const dto = parsed.data;

  try {
    const deal = await db.transaction((tx) => createDealCore(tx, dto, actor));

    const { getDealDetail } = await import("./db-queries");
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    const user = await requireRole(
      "admin",
      "property_manager",
      "owner",
      "client",
      "tenant",
    );
    const detail = await getDealDetail(user, deal);
    return { ok: true, data: detail };
  } catch (e) {
    return catchResult(e);
  }
}

export async function acceptDealAction(id: string): Promise<ActionResult<Deal>> {
  const actor = await requireRole("admin", "client", "owner", "tenant");
  try {
    const result = await db.transaction(async (tx) => {
      const [deal] = await tx
        .select()
        .from(schema.deals)
        .where(eq(schema.deals.id, id));
      if (!deal) throw new Error("Deal not found.");
      if (deal.status !== "pending_acceptance") {
        throw new Error("Deal is not awaiting acceptance.");
      }
      if (
        actor.role !== "admin" &&
        actor.id !== deal.counterpartyId &&
        actor.id !== deal.createdBy
      ) {
        throw new Error("You are not allowed to accept this deal.");
      }
      await tx.insert(schema.dealAcceptances).values({
        dealId: id,
        acceptedBy: actor.id,
      });
      const [active] = await tx
        .update(schema.deals)
        .set({
          status: "active",
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.deals.id, id),
            eq(schema.deals.status, "pending_acceptance"),
          ),
        )
        .returning();
      if (!active) throw new Error("Deal changed concurrently.");
      await audit(tx, id, "accepted", actor.id);
      return { ...active, type: deal.type, propertyId: deal.propertyId };
    });
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: result as unknown as Deal };
  } catch (e) {
    return catchResult(e);
  }
}

export async function recordDealPaymentAction(
  id: string,
  values: PaymentFormValues,
): Promise<ActionResult<DealPaymentDTO>> {
  const actor = await requireRole("admin", "accountant");
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const updatedPayment = await db.transaction(async (tx) => {
      const [deal] = await tx
        .select()
        .from(schema.deals)
        .where(eq(schema.deals.id, id));
      if (!deal) throw new Error("Deal not found.");
      if (deal.status !== "active") {
        throw new Error("Deal is not payable.");
      }
      const existingPayments = await tx
        .select()
        .from(schema.dealPayments)
        .where(
          and(
            eq(schema.dealPayments.dealId, id),
            eq(schema.dealPayments.status, "posted"),
          ),
        );
      const paid = existingPayments.reduce(
        (sum, entry) => sum + amount(entry.amount),
        0,
      );
      const expected = amount(deal.totalAmount) + amount(deal.taxAmount);
      if (
        deal.totalAmount &&
        paid + amount(parsed.data.amount) > expected + 0.01
      ) {
        throw new Error("Payment exceeds the deal balance.");
      }

      const schedules = await tx
        .select()
        .from(schema.dealPaymentSchedules)
        .where(eq(schema.dealPaymentSchedules.dealId, id))
        .orderBy(schema.dealPaymentSchedules.sequence);

      let remaining = amount(parsed.data.amount);
      let allocatedPrincipal = 0;
      let allocatedTax = 0;
      const allocations: Array<{
        schedule: typeof schema.dealPaymentSchedules.$inferSelect;
        principal: number;
        tax: number;
        paidTax: number;
        paidPrincipal: number;
      }> = [];

      for (const schedule of schedules) {
        if (remaining <= 0) break;
        if (schedule.status === "cancelled") continue;
        const outstandingTax =
          amount(schedule.taxAmount) - amount(schedule.paidTax);
        const outstandingPrincipal =
          amount(schedule.principalAmount) - amount(schedule.paidPrincipal);
        const taxAllocation = Math.min(
          remaining,
          Math.max(0, outstandingTax),
        );
        remaining -= taxAllocation;
        const principalAllocation = Math.min(
          remaining,
          Math.max(0, outstandingPrincipal),
        );
        remaining -= principalAllocation;
        if (taxAllocation || principalAllocation) {
          allocatedTax += taxAllocation;
          allocatedPrincipal += principalAllocation;
          allocations.push({
            schedule,
            principal: principalAllocation,
            tax: taxAllocation,
            paidTax: amount(schedule.paidTax) + taxAllocation,
            paidPrincipal: amount(schedule.paidPrincipal) + principalAllocation,
          });
        }
      }
      if (remaining > 0) allocatedPrincipal += remaining;

      const [payment] = await tx
        .insert(schema.dealPayments)
        .values({
          dealId: id,
          amount: moneyString(parsed.data.amount),
          principalAmount: money(allocatedPrincipal),
          taxAmount: money(allocatedTax),
          paymentMethod: parsed.data.paymentMethod as never,
          reference: parsed.data.reference,
          notes: parsed.data.notes,
          recordedBy: actor.id,
        })
        .returning();

      for (const allocation of allocations) {
        await tx.insert(schema.dealPaymentAllocations).values({
          paymentId: payment.id,
          scheduleId: allocation.schedule.id,
          principalAmount: money(allocation.principal),
          taxAmount: money(allocation.tax),
        });
        await tx
          .update(schema.dealPaymentSchedules)
          .set({
            paidTax: money(allocation.paidTax),
            paidPrincipal: money(allocation.paidPrincipal),
            status:
              allocation.paidTax + allocation.paidPrincipal + 0.01 >=
              amount(allocation.schedule.taxAmount) +
                amount(allocation.schedule.principalAmount)
                ? "paid"
                : "partially_paid",
          })
          .where(eq(schema.dealPaymentSchedules.id, allocation.schedule.id));
      }

      const updatedPaid = paid + amount(parsed.data.amount);
      if (
        deal.totalAmount &&
        updatedPaid + 0.01 >= expected &&
        ["cash_sale", "installment_purchase"].includes(deal.type)
      ) {
        await tx
          .update(schema.deals)
          .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.deals.id, id));
      }
      await audit(tx, id, "payment_recorded", actor.id, {
        paymentId: payment.id,
        amount: parsed.data.amount,
      });
      return payment;
    });

    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: updatedPayment as unknown as DealPaymentDTO };
  } catch (e) {
    return catchResult(e);
  }
}

export type DealPaymentDTO = {
  id: string
  dealId: string
  amount: string
  principalAmount: string
  taxAmount: string
  status: string
};

export async function reverseDealPaymentAction(
  paymentId: string,
): Promise<ActionResult<DealPaymentDTO>> {
  const actor = await requireRole("admin", "accountant");
  try {
    const payment = await db.transaction(async (tx) => {
      const [entry] = await tx
        .update(schema.dealPayments)
        .set({
          status: "reversed",
          reversedBy: actor.id,
          reversedAt: new Date(),
        })
        .where(
          and(
            eq(schema.dealPayments.id, paymentId),
            eq(schema.dealPayments.status, "posted"),
          ),
        )
        .returning();
      if (!entry) throw new Error("Posted payment not found.");
      const allocations = await tx
        .select()
        .from(schema.dealPaymentAllocations)
        .where(eq(schema.dealPaymentAllocations.paymentId, entry.id));
      for (const allocation of allocations) {
        const [schedule] = await tx
          .select()
          .from(schema.dealPaymentSchedules)
          .where(eq(schema.dealPaymentSchedules.id, allocation.scheduleId));
        if (!schedule) continue;
        await tx
          .update(schema.dealPaymentSchedules)
          .set({
            paidPrincipal: money(
              Math.max(0, amount(schedule.paidPrincipal) - amount(allocation.principalAmount)),
            ),
            paidTax: money(
              Math.max(0, amount(schedule.paidTax) - amount(allocation.taxAmount)),
            ),
            status:
              amount(schedule.paidPrincipal) > 0
                ? "partially_paid"
                : "scheduled",
          })
          .where(eq(schema.dealPaymentSchedules.id, schedule.id));
      }
      await audit(tx, entry.dealId, "payment_reversed", actor.id, { paymentId });
      return entry;
    });
    revalidatePath("/dashboard/deals");
    return { ok: true, data: payment as unknown as DealPaymentDTO };
  } catch (e) {
    return catchResult(e);
  }
}

export async function completeDealAction(id: string): Promise<ActionResult<Deal>> {
  const actor = await requireRole("admin", "property_manager");
  try {
    const completed = await db.transaction(async (tx) => {
      const [deal] = await tx
        .select()
        .from(schema.deals)
        .where(eq(schema.deals.id, id));
      if (!deal) throw new Error("Deal not found.");
      if (deal.status !== "active") {
        throw new Error("Only active deals can be completed.");
      }
      const payments = await tx
        .select()
        .from(schema.dealPayments)
        .where(
          and(
            eq(schema.dealPayments.dealId, id),
            eq(schema.dealPayments.status, "posted"),
          ),
        );
      const paid = payments.reduce((sum, entry) => sum + amount(entry.amount), 0);
      if (
        ["cash_sale", "installment_purchase"].includes(deal.type) &&
        (!deal.totalAmount ||
          paid + 0.01 < amount(deal.totalAmount) + amount(deal.taxAmount))
      ) {
        throw new Error("Deal balance is not fully paid.");
      }
      const [result] = await tx
        .update(schema.deals)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.deals.id, id), eq(schema.deals.status, "active")))
        .returning();
      if (!result) throw new Error("Deal changed concurrently.");
      await audit(tx, id, "completed", actor.id, { paidAmount: paid });
      return { ...result, type: deal.type, propertyId: deal.propertyId };
    });
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: completed as unknown as Deal };
  } catch (e) {
    return catchResult(e);
  }
}

export async function settleDealAction(
  id: string,
  kind: "cancelled" | "terminated",
  values: SettlementFormValues,
): Promise<ActionResult<Deal>> {
  const actor =
    kind === "terminated"
      ? await requireRole("admin", "property_manager", "owner")
      : await requireRole("admin", "property_manager", "owner", "client", "tenant");
  const parsed = settlementSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const settled = await db.transaction(async (tx) => {
      const [deal] = await tx
        .select()
        .from(schema.deals)
        .where(eq(schema.deals.id, id));
      if (!deal) throw new Error("Deal not found.");
      if (["completed", "cancelled", "terminated"].includes(deal.status)) {
        throw new Error("Deal cannot be settled.");
      }
      if (actor.role === "owner" && deal.sellerId !== actor.id) {
        throw new Error("You are not allowed to settle this deal.");
      }
      if (
        kind === "cancelled" &&
        actor.role !== "admin" &&
        actor.id !== deal.createdBy &&
        actor.id !== deal.counterpartyId
      ) {
        throw new Error("You are not allowed to cancel this deal.");
      }

      const payments = await tx
        .select()
        .from(schema.dealPayments)
        .where(
          and(
            eq(schema.dealPayments.dealId, id),
            eq(schema.dealPayments.status, "posted"),
          ),
        );
      const paid = payments.reduce(
        (sum, entry) => sum + amount(entry.amount),
        0,
      );
      const paidTax = payments.reduce(
        (sum, entry) => sum + amount(entry.taxAmount),
        0,
      );
      const refund = Math.min(
        parsed.data.refundAmount ? amount(parsed.data.refundAmount) : paid,
        paid,
      );
      const refundTax =
        paid > 0 ? Math.min(paidTax, (refund / paid) * paidTax) : 0;

      const [result] = await tx
        .update(schema.deals)
        .set({
          status: kind,
          cancelledAt: kind === "cancelled" ? new Date() : null,
          terminatedAt: kind === "terminated" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.deals.id, id),
            inArray(schema.deals.status, ["pending_acceptance", "active"]),
          ),
        )
        .returning();
      if (!result) throw new Error("Deal changed concurrently.");

      await tx.insert(schema.dealSettlements).values({
        dealId: id,
        kind: kind === "cancelled" ? "cancellation" : "termination",
        paidAmount: money(paid),
        refundAmount: money(refund),
        refundPrincipalAmount: money(refund - refundTax),
        refundTaxAmount: money(refundTax),
        reason: parsed.data.reason,
        settledBy: actor.id,
      });
      await tx
        .update(schema.properties)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(schema.properties.id, deal.propertyId));
      await audit(tx, id, kind, actor.id, {
        paidAmount: paid,
        refundAmount: refund,
        refundTaxAmount: refundTax,
        reason: parsed.data.reason,
      });
      return { ...result, type: deal.type, propertyId: deal.propertyId };
    });
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: settled as unknown as Deal };
  } catch (e) {
    return catchResult(e);
  }
}

export async function addDealDocumentAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<DealDocumentDTO>> {
  const actor = await requireRole("admin", "property_manager", "owner", "accountant");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorResult("A document file is required.");
  }
  try {
    const upload = await saveUpload(file);
    await db.insert(schema.documents).values({
      entityId: id,
      entityType: "deals",
      name: file.name,
      fileType: upload.fileType,
      fileSize: upload.fileSize,
      fileUrl: upload.url,
      uploadedBy: actor.id,
    });
    revalidatePath("/dashboard/deals");
    return { ok: true, data: { name: file.name, url: upload.url } };
  } catch (e) {
    return catchResult(e);
  }
}

type DealDocumentDTO = { name: string; url: string };