import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { schema } from "@/db";
import { logActivity, type DbOrTransaction } from "@/lib/activity";
import { moneyString } from "@/lib/utils";
import type { DealFormValues } from "./validations";
import type { Deal, DealFrequency, DealType, FilerStatus, SessionUser, UUID } from "@/types";

export const amount = (value: string | number | null | undefined) =>
  Number(value ?? 0);
export const money = (value: number) => value.toFixed(2);
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export async function audit(
  tx: DbOrTransaction,
  dealId: string,
  action: string,
  actorId: string,
  details?: Record<string, unknown>,
) {
  await logActivity(tx, {
    action: action === "created" ? "create" : "update",
    entityType: "deals",
    entityId: dealId,
    doneBy: actorId,
    details: { ...details, event: action },
  });
}

export async function calculateTax(
  tx: DbOrTransaction,
  type: DealType,
  baseAmount: number,
  policyId?: string,
  filerStatus?: FilerStatus,
) {
  if (!policyId) {
    return {
      baseAmount,
      totalTaxAmount: 0,
      breakdown: [],
    };
  }

  const asOf = new Date();
  const dateValue = asOf.toISOString().slice(0, 10);
  const typeMatch = sql`${schema.taxPolicies.appliesTo} @> ARRAY[${type}]::deal_type[]`;
  const windowMatch = and(
    or(
      isNull(schema.taxPolicies.effectiveStart),
      lte(schema.taxPolicies.effectiveStart, dateValue),
    ),
    or(
      isNull(schema.taxPolicies.effectiveEnd),
      gte(schema.taxPolicies.effectiveEnd, dateValue),
    ),
  );

  const selected = await tx
    .select()
    .from(schema.taxPolicies)
    .where(
      and(
        eq(schema.taxPolicies.id, policyId),
        eq(schema.taxPolicies.active, true),
        typeMatch,
        windowMatch,
      ),
    );
  if (selected.length === 0) {
    throw new Error("The selected tax policy is not active or applicable.");
  }

  const policy = selected[0];
  let effectiveValue = amount(policy.value);

  if (policy.filerStatus && policy.filerStatus !== (filerStatus ?? "non_filer")) {
    throw new Error("Tax policy filer status does not match the payer's filer status.");
  }

  if (policy.minValue && baseAmount < amount(policy.minValue)) {
    return { baseAmount, totalTaxAmount: 0, breakdown: [] };
  }
  if (policy.maxValue && baseAmount > amount(policy.maxValue)) {
    return { baseAmount, totalTaxAmount: 0, breakdown: [] };
  }

  const breakdown = selected.map((p) => ({
    policy: p,
    taxAmount: roundMoney(
      p.kind === "percentage"
        ? (baseAmount * amount(p.value)) / 100
        : amount(p.value),
    ),
  }));
  return {
    baseAmount,
    totalTaxAmount: roundMoney(
      breakdown.reduce((sum, item) => sum + item.taxAmount, 0),
    ),
    breakdown,
  };
}

export function installmentDueDate(
  startsOn: string | undefined,
  sequence: number,
  frequency: DealFrequency,
) {
  const date = startsOn
    ? new Date(`${startsOn}T00:00:00`)
    : new Date();
  const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  date.setMonth(date.getMonth() + sequence * months);
  return date.toISOString().slice(0, 10);
}

export function leaseContractValue(dto: Pick<DealFormValues, "type" | "startsOn" | "endsOn" | "rentAmount" | "frequency">) {
  const rent = amount(dto.rentAmount ?? 0);
  if (dto.type === "periodic_rent") return rent;
  const periodMonths =
    dto.frequency === "monthly" ? 1 : dto.frequency === "quarterly" ? 3 : 12;
  if (dto.startsOn && dto.endsOn) {
    const start = new Date(`${dto.startsOn}T00:00:00`);
    const end = new Date(`${dto.endsOn}T00:00:00`);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return rent * Math.max(1, Math.ceil(Math.max(0, months) / periodMonths));
  }
  return rent * periodMonths;
}

export async function createDealCore(
  tx: DbOrTransaction,
  dto: DealFormValues,
  actor: SessionUser,
): Promise<string> {
  const [property] = await tx
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.id, dto.propertyId));
  if (!property) throw new Error("Property not found.");
  if (property.status !== "available" && property.status !== "vacant") {
    throw new Error("Property already has an active deal.");
  }
  const [counterparty] = await tx
    .select({ id: schema.users.id, filerStatus: schema.users.filerStatus })
    .from(schema.users)
    .where(eq(schema.users.id, dto.counterpartyId));
  if (!counterparty) throw new Error("Counterparty not found.");

  let installmentTerms: {
    downPaymentAmount: string
    installmentAmount: string
    installmentCount: number
    frequency: DealFrequency
  } | undefined;

  if (dto.type === "installment_purchase") {
    installmentTerms = {
      downPaymentAmount: dto.downPaymentAmount ?? "0",
      installmentAmount: dto.installmentAmount ?? "0",
      installmentCount: Number(dto.installmentCount ?? 0),
      frequency: (dto.frequency ?? "monthly") as DealFrequency,
    };
  }

  const contractedAmount =
    dto.type === "installment_purchase"
      ? amount(installmentTerms!.downPaymentAmount) +
        amount(installmentTerms!.installmentAmount) *
          installmentTerms!.installmentCount
      : dto.type === "fixed_lease" || dto.type === "periodic_rent"
        ? leaseContractValue(dto)
        : amount(dto.totalAmount ?? 0);

  const isSaleLike = ["cash_sale", "installment_purchase"].includes(
    dto.type,
  );

  const taxCalculation = await calculateTax(
    tx,
    dto.type,
    contractedAmount,
    dto.taxPolicyId,
    counterparty.filerStatus as FilerStatus | undefined,
  );

  const [deal] = await tx
    .insert(schema.deals)
    .values({
      propertyId: dto.propertyId,
      type: dto.type,
      counterpartyId: dto.counterpartyId,
      sellerId: actor.role === "owner" ? actor.id : null,
      currency: dto.currency,
      startsOn: dto.startsOn,
      endsOn: dto.endsOn,
      totalAmount:
        dto.type === "installment_purchase"
          ? money(contractedAmount)
          : dto.totalAmount,
      taxAmount: money(taxCalculation.totalTaxAmount),
      snapshot: {
        property: {
          id: property.id,
          title: property.title,
          description: property.description,
          type: property.type,
          price: property.price,
          areaValue: property.areaValue,
          areaUnit: property.areaUnit,
        },
        terms: { ...dto },
        capturedAt: new Date().toISOString(),
      },
      createdBy: actor.id,
    })
    .returning();

  if (dto.type === "cash_sale") {
    await tx.insert(schema.dealSaleDetails).values({
      dealId: deal.id,
      paymentMethod: dto.paymentMethod as never,
      dueOn: dto.dueOn,
    });
  } else if (dto.type === "fixed_lease" || dto.type === "periodic_rent") {
    await tx.insert(schema.dealLeaseDetails).values({
      dealId: deal.id,
      rentAmount: moneyString(dto.rentAmount ?? "0"),
      depositAmount: moneyString(dto.depositAmount ?? "0"),
      advanceRentMonths: Number(dto.advanceRentMonths ?? 0),
      frequency: (dto.frequency ?? "monthly") as never,
      fixedTerm: dto.type === "fixed_lease",
      noticePeriodDays: dto.noticePeriodDays ? Number(dto.noticePeriodDays) : null,
    });
  } else {
    await tx.insert(schema.dealInstallmentDetails).values({
      dealId: deal.id,
      downPaymentAmount: installmentTerms!.downPaymentAmount,
      installmentAmount: installmentTerms!.installmentAmount,
      installmentCount: installmentTerms!.installmentCount,
      frequency: installmentTerms!.frequency as never,
    });
  }

  const taxTotal = amount(taxCalculation.totalTaxAmount);
  if (isSaleLike) {
    const principalAmounts =
      dto.type === "cash_sale"
        ? [contractedAmount]
        : [
            amount(installmentTerms!.downPaymentAmount),
            ...Array.from(
              { length: installmentTerms!.installmentCount },
              () => amount(installmentTerms!.installmentAmount),
            ),
          ];
    const totalPrincipal = principalAmounts.reduce(
      (sum, value) => sum + value,
      0,
    );
    let allocatedTax = 0;
    await tx.insert(schema.dealPaymentSchedules).values(
      principalAmounts.map((principal, index) => {
        const taxForSchedule: number =
          index === principalAmounts.length - 1
            ? taxTotal - allocatedTax
            : amount(money((taxTotal * principal) / totalPrincipal));
        allocatedTax += taxForSchedule;
        return {
          dealId: deal.id,
          sequence: index,
          dueOn:
            dto.type === "cash_sale"
              ? dto.dueOn
              : installmentDueDate(
                  dto.startsOn,
                  index,
                  installmentTerms!.frequency,
                ),
          principalAmount: money(principal),
          taxAmount: money(taxForSchedule),
        };
      }),
    );
  }

  if (taxCalculation.breakdown.length) {
    await tx.insert(schema.dealTaxSnapshots).values(
      taxCalculation.breakdown.map((item) => ({
        dealId: deal.id,
        policyId: item.policy.id,
        policyName: item.policy.name,
        policyKind: item.policy.kind,
        policyValue: item.policy.value,
        filerStatusUsed: (counterparty.filerStatus ?? "non_filer") as FilerStatus,
        policyCode: item.policy.code,
        authority: item.policy.authority,
        baseAmount: money(contractedAmount),
        taxAmount: money(item.taxAmount),
        currency: dto.currency,
      })),
    );
  }

  await tx
    .update(schema.properties)
    .set({ updatedAt: new Date() })
    .where(eq(schema.properties.id, property.id));
  await audit(tx, deal.id, "created", actor.id, { type: dto.type });
  return deal.id;
}

export type { Deal, UUID };