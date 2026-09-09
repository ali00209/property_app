"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { moneyString } from "@/lib/utils";
import type { ActionResult, InstallmentAssignment, InstallmentPlan } from "@/types";
import { createDealCore } from "@/features/deal/core";
import {
  assignmentSchema,
  installmentPlanSchema,
  type AssignmentFormValues,
  type InstallmentPlanFormValues,
} from "./validations";
import {
  rejectRequestSchema,
  requestSchema,
  type RejectRequestValues,
  type RequestFormValues,
} from "./request-validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown, context: string): ActionResult<never> {
  const message = e instanceof Error && e.message ? e.message : context;
  return errorResult(message);
}

const frequencyMonths = (frequency: "monthly" | "quarterly" | "annually") =>
  frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12

export async function createInstallmentPlanAction(
  values: InstallmentPlanFormValues,
): Promise<ActionResult<InstallmentPlan>> {
  const actor = await requireRole("admin");
  const parsed = installmentPlanSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [plan] = await db
      .insert(schema.installmentPlanTemplates)
      .values({
        name: parsed.data.name,
        description: parsed.data.description || null,
        frequency: parsed.data.frequency,
        termMonths: Number(parsed.data.termMonths),
        downPaymentPercent: moneyString(Number(parsed.data.downPaymentPercent)),
        interestRate: moneyString(Number(parsed.data.interestRate)),
        createdBy: actor.id,
      })
      .returning();
    revalidatePath("/dashboard/installments");
    return { ok: true, data: plan as unknown as InstallmentPlan };
  } catch (error) {
    return catchResult(error, "Failed to create the installment plan.");
  }
}

export async function updateInstallmentPlanAction(
  id: string,
  values: Partial<InstallmentPlanFormValues>,
): Promise<ActionResult<InstallmentPlan>> {
  await requireRole("admin");
  const parsed = installmentPlanSchema.partial().safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [plan] = await db
      .update(schema.installmentPlanTemplates)
      .set({
        ...parsed.data,
        ...(parsed.data.termMonths !== undefined
          ? { termMonths: Number(parsed.data.termMonths) }
          : {}),
        ...(parsed.data.downPaymentPercent !== undefined
          ? { downPaymentPercent: moneyString(Number(parsed.data.downPaymentPercent)) }
          : {}),
        ...(parsed.data.interestRate !== undefined
          ? { interestRate: moneyString(Number(parsed.data.interestRate)) }
          : {}),
        updatedAt: new Date(),
      } as never)
      .where(eq(schema.installmentPlanTemplates.id, id))
      .returning();
    if (!plan) return errorResult("Installment plan not found.");
    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: plan as unknown as InstallmentPlan };
  } catch (error) {
    return catchResult(error, "Failed to update the installment plan.");
  }
}

export async function publishInstallmentPlanAction(
  id: string,
): Promise<ActionResult<InstallmentPlan>> {
  await requireRole("admin");
  try {
    const [plan] = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.installmentPlanTemplates)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(schema.installmentPlanTemplates.id, id))
        .returning();
      if (!updated) return [];
      await tx
        .update(schema.propertyInstallmentPlans)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(schema.propertyInstallmentPlans.templateId, id));
      return [updated];
    });
    if (!plan) return errorResult("Installment plan not found.");
    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: plan as unknown as InstallmentPlan };
  } catch (error) {
    return catchResult(error, "Failed to publish the installment plan.");
  }
}

export async function archiveInstallmentPlanAction(
  id: string,
): Promise<ActionResult<InstallmentPlan>> {
  await requireRole("admin");
  try {
    const [plan] = await db
      .update(schema.installmentPlanTemplates)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(schema.installmentPlanTemplates.id, id))
      .returning();
    if (!plan) return errorResult("Installment plan not found.");
    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: plan as unknown as InstallmentPlan };
  } catch (error) {
    return catchResult(error, "Failed to archive the installment plan.");
  }
}

export async function assignPropertyAction(
  templateId: string,
  values: AssignmentFormValues,
): Promise<ActionResult<InstallmentAssignment>> {
  const actor = await requireRole("admin");
  const parsed = assignmentSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const assignment = await db.transaction(async (tx) => {
      const [template] = await tx
        .select()
        .from(schema.installmentPlanTemplates)
        .where(eq(schema.installmentPlanTemplates.id, templateId));
      if (!template) throw new Error("Installment plan not found.");
      if (template.status === "archived") {
        throw new Error("Archived plans cannot be assigned.");
      }
      const [property] = await tx
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.id, parsed.data.propertyId));
      if (!property) throw new Error("Property not found.");
      if (property.status !== "available") {
        throw new Error("Property is not available for assignment.");
      }

      const [existing] = await tx
        .select()
        .from(schema.propertyInstallmentPlans)
        .where(
          and(
            eq(schema.propertyInstallmentPlans.propertyId, parsed.data.propertyId),
            eq(schema.propertyInstallmentPlans.templateId, templateId),
          ),
        );
      if (existing) {
        throw new Error("Property is already assigned to this plan.");
      }

      const price = Number(parsed.data.price);
      const downPaymentAmount =
        parsed.data.downPaymentAmount !== undefined &&
        parsed.data.downPaymentAmount !== ""
          ? Number(parsed.data.downPaymentAmount)
          : (price * Number(template.downPaymentPercent)) / 100;
      if (downPaymentAmount > price) {
        throw new Error("Down payment cannot exceed the property price.");
      }
      const periods = Math.ceil(
        template.termMonths / frequencyMonths(template.frequency),
      );
      const installmentAmount =
        parsed.data.installmentAmount !== undefined &&
        parsed.data.installmentAmount !== ""
          ? Number(parsed.data.installmentAmount)
          : ((price - downPaymentAmount) *
              (1 + Number(template.interestRate) / 100)) /
            periods;

      const [row] = await tx
        .insert(schema.propertyInstallmentPlans)
        .values({
          propertyId: parsed.data.propertyId,
          templateId,
          price: moneyString(price),
          downPaymentAmount: moneyString(downPaymentAmount),
          installmentAmount: moneyString(installmentAmount),
          status: template.status === "published" ? "published" : "draft",
          createdBy: actor.id,
        })
        .returning();

      const [[propertyTitleRow], [planNameRow]] = await Promise.all([
        tx
          .select({ name: schema.properties.title })
          .from(schema.properties)
          .where(eq(schema.properties.id, parsed.data.propertyId))
          .limit(1),
        tx
          .select({ name: schema.installmentPlanTemplates.name })
          .from(schema.installmentPlanTemplates)
          .where(eq(schema.installmentPlanTemplates.id, templateId))
          .limit(1),
      ]);

      return {
        ...row,
        propertyTitle: propertyTitleRow?.name ?? "",
        planName: planNameRow?.name ?? "",
      };
    });

    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    revalidatePath(`/dashboard/properties/${parsed.data.propertyId}`);
    return { ok: true, data: assignment as unknown as InstallmentAssignment };
  } catch (error) {
    return catchResult(error, "Failed to assign the property.");
  }
}

export async function publishAssignmentAction(
  id: string,
): Promise<ActionResult<InstallmentAssignment>> {
  await requireRole("admin");
  try {
    const [assignment] = await db
      .update(schema.propertyInstallmentPlans)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(schema.propertyInstallmentPlans.id, id))
      .returning();
    if (!assignment) return errorResult("Property plan not found.");
    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: assignment as unknown as InstallmentAssignment };
  } catch (error) {
    return catchResult(error, "Failed to publish the property plan.");
  }
}

export async function createRequestAction(
  values: RequestFormValues,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("client");
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const request = await db.transaction(async (tx) => {
      const [assignment] = await tx
        .select()
        .from(schema.propertyInstallmentPlans)
        .leftJoin(
          schema.installmentPlanTemplates,
          eq(
            schema.installmentPlanTemplates.id,
            schema.propertyInstallmentPlans.templateId,
          ),
        )
        .where(
          and(
            eq(schema.propertyInstallmentPlans.id, parsed.data.propertyPlanId),
            eq(schema.propertyInstallmentPlans.status, "published"),
            eq(schema.installmentPlanTemplates.status, "published"),
          ),
        );
      if (!assignment?.property_installment_plans) {
        throw new Error("A published plan is required.");
      }
      const [property] = await tx
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.id, assignment.property_installment_plans.propertyId));
      if (!property || property.status !== "available") {
        throw new Error("This property is no longer available.");
      }
      const [duplicate] = await tx
        .select()
        .from(schema.purchaseRequests)
        .where(
          and(
            eq(schema.purchaseRequests.buyerId, actor.id),
            eq(schema.purchaseRequests.propertyPlanId, parsed.data.propertyPlanId),
            eq(schema.purchaseRequests.status, "pending"),
          ),
        );
      if (duplicate) {
        throw new Error("You already have a pending request for this plan.");
      }
      const [row] = await tx
        .insert(schema.purchaseRequests)
        .values({
          propertyPlanId: parsed.data.propertyPlanId,
          propertyId: assignment.property_installment_plans.propertyId,
          buyerId: actor.id,
          note: parsed.data.note || null,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "properties",
        entityId: assignment.property_installment_plans.propertyId,
        doneBy: actor.id,
        details: JSON.stringify({ requestId: row.id }),
      });
      return row;
    });

    revalidatePath("/dashboard/installments");
    return { ok: true, data: { id: request.id } };
  } catch (error) {
    return catchResult(error, "Failed to submit the purchase request.");
  }
}

export async function approveRequestAction(
  id: string,
): Promise<ActionResult<{ requestId: string; dealId: string }>> {
  const actor = await requireRole("admin");
  try {
    const result = await db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(schema.purchaseRequests)
        .where(eq(schema.purchaseRequests.id, id));
      if (!request) throw new Error("Purchase request not found.");
      if (request.status !== "pending") {
        throw new Error("Only pending requests can be approved.");
      }
      const [assignment] = await tx
        .select()
        .from(schema.propertyInstallmentPlans)
        .leftJoin(
          schema.installmentPlanTemplates,
          eq(
            schema.installmentPlanTemplates.id,
            schema.propertyInstallmentPlans.templateId,
          ),
        )
        .where(
          and(
            eq(schema.propertyInstallmentPlans.id, request.propertyPlanId),
            eq(schema.propertyInstallmentPlans.status, "published"),
            eq(schema.installmentPlanTemplates.status, "published"),
          ),
        );
      if (!assignment?.property_installment_plans || !assignment.installment_plan_templates) {
        throw new Error("Published plan no longer available.");
      }

      const freqMonths =
        assignment.installment_plan_templates.frequency === "monthly"
          ? 1
          : assignment.installment_plan_templates.frequency === "quarterly"
            ? 3
            : 12;
      const periods = Math.ceil(
        assignment.installment_plan_templates.termMonths / freqMonths,
      );
      const downPaymentAmount = Number(
        assignment.property_installment_plans.downPaymentAmount,
      );
      const installmentAmount = Number(
        assignment.property_installment_plans.installmentAmount,
      );
      const totalAmount = downPaymentAmount + installmentAmount * periods;
      const today = new Date().toISOString().slice(0, 10);

      const [contract] = await tx
        .insert(schema.purchaseContracts)
        .values({
          requestId: request.id,
          propertyPlanId: assignment.property_installment_plans.id,
          propertyId: request.propertyId,
          buyerId: request.buyerId,
          status: "active",
          totalAmount: moneyString(totalAmount),
          downPaymentAmount: moneyString(downPaymentAmount),
          installmentAmount: moneyString(installmentAmount),
          installmentCount: periods,
          startDate: today,
        })
        .returning();

      await tx.insert(schema.scheduledInstallments).values([
        {
          contractId: contract.id,
          sequence: 0,
          dueDate: today,
          amount: moneyString(downPaymentAmount),
        },
        ...Array.from({ length: periods }, (_, index) => {
          const due = new Date(`${today}T00:00:00`);
          due.setMonth(due.getMonth() + (index + 1) * freqMonths);
          return {
            contractId: contract.id,
            sequence: index + 1,
            dueDate: due.toISOString().slice(0, 10),
            amount: moneyString(installmentAmount),
          };
        }),
      ]);

      await tx
        .update(schema.purchaseRequests)
        .set({
          status: "approved",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.purchaseRequests.id, request.id));

      const dealId = await createDealCore(tx, {
        propertyId: request.propertyId,
        type: "installment_purchase",
        counterpartyId: request.buyerId,
        propertyPlanId: assignment.property_installment_plans.id,
        currency: "PKR",
        frequency: "monthly",
        startsOn: today,
        notes: request.note ?? undefined,
      }, actor);

      await tx
        .update(schema.purchaseContracts)
        .set({ dealId, updatedAt: new Date() })
        .where(eq(schema.purchaseContracts.id, contract.id));

      await logActivity(tx, {
        action: "update",
        entityType: "properties",
        entityId: request.propertyId,
        doneBy: actor.id,
        details: JSON.stringify({ requestId: request.id, dealId }),
      });
      return { requestId: request.id, dealId };
    });

    revalidatePath("/dashboard/installments");
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: result };
  } catch (error) {
    return catchResult(error, "Failed to approve the purchase request.");
  }
}

export async function rejectRequestAction(
  id: string,
  values: RejectRequestValues,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("admin");
  const parsed = rejectRequestSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const request = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.purchaseRequests)
        .set({
          status: "rejected",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          rejectionReason: parsed.data.reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.purchaseRequests.id, id),
            eq(schema.purchaseRequests.status, "pending"),
          ),
        )
        .returning();
      if (!row) throw new Error("Only pending requests can be rejected.");
      await logActivity(tx, {
        action: "update",
        entityType: "properties",
        entityId: row.propertyId,
        doneBy: actor.id,
        details: JSON.stringify({ requestId: row.id, rejected: true }),
      });
      return row;
    });

    revalidatePath("/dashboard/installments");
    return { ok: true, data: { id: request.id } };
  } catch (error) {
    return catchResult(error, "Failed to reject the purchase request.");
  }
}

export async function cancelRequestAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("client", "admin");
  try {
    const request = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.purchaseRequests)
        .where(eq(schema.purchaseRequests.id, id));
      if (!existing) throw new Error("Purchase request not found.");
      if (actor.role !== "admin" && existing.buyerId !== actor.id) {
        throw new Error("You cannot cancel another buyer's request.");
      }
      if (existing.status !== "pending") {
        throw new Error("Only pending requests can be cancelled.");
      }
      const [row] = await tx
        .update(schema.purchaseRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(schema.purchaseRequests.id, id))
        .returning();
      await logActivity(tx, {
        action: "delete",
        entityType: "properties",
        entityId: existing.propertyId,
        doneBy: actor.id,
        details: JSON.stringify({ requestId: row.id, cancelled: true }),
      });
      return row;
    });

    revalidatePath("/dashboard/installments");
    return { ok: true, data: { id: request.id } };
  } catch (error) {
    return catchResult(error, "Failed to cancel the purchase request.");
  }
}