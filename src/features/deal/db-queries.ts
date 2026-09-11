import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import type {
  Deal,
  DealDetail,
  DealOption,
  DealStatus,
  DealSummary,
  DealType,
  Property,
  SessionUser,
  UUID,
} from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

export function assertCanViewDeal(
  deal: Pick<
    Deal,
    "counterpartyId" | "sellerId" | "createdBy"
  >,
  user: SessionUser,
): void {
  const allowed =
    user.role === "admin" ||
    deal.counterpartyId === user.id ||
    deal.sellerId === user.id ||
    deal.createdBy === user.id;
  if (!allowed) notFound();
}

export async function listDeals(
  user: SessionUser,
  type?: DealType,
  status?: DealStatus,
): Promise<Deal[]> {
  const filters = [];
  if (type) filters.push(eq(schema.deals.type, type));
  if (status) filters.push(eq(schema.deals.status, status));
  if (user.role === "client" || user.role === "tenant") {
    filters.push(eq(schema.deals.counterpartyId, user.id));
  } else if (user.role === "owner") {
    filters.push(eq(schema.deals.sellerId, user.id));
  }

  const rows = await db
    .select()
    .from(schema.deals)
    .leftJoin(schema.properties, eq(schema.properties.id, schema.deals.propertyId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.deals.createdAt));

  return rows.map((row) => ({
    ...row.deals,
    createdAt: iso(row.deals.createdAt),
    updatedAt: iso(row.deals.updatedAt),
    acceptedAt: iso(row.deals.acceptedAt),
    completedAt: iso(row.deals.completedAt),
    cancelledAt: iso(row.deals.cancelledAt),
    terminatedAt: iso(row.deals.terminatedAt),
    property: row.properties
      ? { ...row.properties, createdAt: iso(row.properties.createdAt), updatedAt: iso(row.properties.updatedAt) }
      : null,
  })) as unknown as Deal[];
}

export async function getDealDetail(
  user: SessionUser,
  id: string,
): Promise<DealDetail> {
  const [row] = await db
    .select()
    .from(schema.deals)
    .leftJoin(schema.properties, eq(schema.properties.id, schema.deals.propertyId))
    .where(eq(schema.deals.id, id));
  if (!row) notFound();
  assertCanViewDeal(row.deals, user);

  const [sale] = await db
    .select()
    .from(schema.dealSaleDetails)
    .where(eq(schema.dealSaleDetails.dealId, id));
  const [lease] = await db
    .select()
    .from(schema.dealLeaseDetails)
    .where(eq(schema.dealLeaseDetails.dealId, id));
  const [installment] = await db
    .select()
    .from(schema.dealInstallmentDetails)
    .where(eq(schema.dealInstallmentDetails.dealId, id));
  const payments = await db
    .select()
    .from(schema.dealPayments)
    .where(eq(schema.dealPayments.dealId, id))
    .orderBy(desc(schema.dealPayments.createdAt));
  const documents = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.entityType, "deals"),
        eq(schema.documents.entityId, id),
      ),
    );
  const acceptances = await db
    .select()
    .from(schema.dealAcceptances)
    .where(eq(schema.dealAcceptances.dealId, id));
  const taxes = await db
    .select()
    .from(schema.dealTaxSnapshots)
    .where(eq(schema.dealTaxSnapshots.dealId, id));
  const paymentSchedule = await db
    .select()
    .from(schema.dealPaymentSchedules)
    .where(eq(schema.dealPaymentSchedules.dealId, id))
    .orderBy(schema.dealPaymentSchedules.sequence);
  const paymentAllocations = await db
    .select()
    .from(schema.dealPaymentAllocations)
    .innerJoin(
      schema.dealPayments,
      eq(schema.dealPayments.id, schema.dealPaymentAllocations.paymentId),
    )
    .where(eq(schema.dealPayments.dealId, id));
  const settlements = await db
    .select()
    .from(schema.dealSettlements)
    .where(eq(schema.dealSettlements.dealId, id));
  const auditLogs = await db
    .select()
    .from(schema.activity)
    .where(
      and(
        eq(schema.activity.entityType, "deals"),
        eq(schema.activity.entityId, id),
      ),
    )
    .orderBy(desc(schema.activity.createdAt));

  const actorIds = [
    ...new Set(auditLogs.map((log) => log.doneBy).filter(Boolean) as string[]),
  ];
  const actors =
    actorIds.length > 0
      ? await db
          .select({ id: schema.users.id, name: schema.users.name })
          .from(schema.users)
          .where(inArray(schema.users.id, actorIds))
      : [];
  const actorNameMap = new Map(actors.map((actor) => [actor.id, actor.name]));

  return {
    ...row.deals,
    snapshot: (row.deals.snapshot as Record<string, unknown> | null) ?? {},
    createdAt: iso(row.deals.createdAt),
    updatedAt: iso(row.deals.updatedAt),
    acceptedAt: iso(row.deals.acceptedAt),
    completedAt: iso(row.deals.completedAt),
    cancelledAt: iso(row.deals.cancelledAt),
    terminatedAt: iso(row.deals.terminatedAt),
    tokenPaidAt: iso(row.deals.tokenPaidAt),
    mutationCompletedAt: iso(row.deals.mutationCompletedAt),
    possessionGrantedAt: iso(row.deals.possessionGrantedAt),
    property: row.properties
      ? { ...row.properties, createdAt: iso(row.properties.createdAt), updatedAt: iso(row.properties.updatedAt) }
      : null,
    sale: sale ? { ...sale, createdAt: iso(sale.createdAt) } as DealDetail["sale"] : null,
    lease: lease ? { ...lease, createdAt: iso(lease.createdAt) } as DealDetail["lease"] : null,
    installment: installment
      ? { ...installment, createdAt: iso(installment.createdAt) } as DealDetail["installment"]
      : null,
    payments: payments.map((payment) => ({
      ...payment,
      reversedAt: iso(payment.reversedAt),
      createdAt: iso(payment.createdAt),
    })) as DealDetail["payments"],
    documents: documents.map((document) => ({
      ...document,
      createdAt: iso(document.createdAt),
    })) as DealDetail["documents"],
    acceptances: acceptances.map((acceptance) => ({
      ...acceptance,
      acceptedAt: iso(acceptance.acceptedAt),
    })) as DealDetail["acceptances"],
    taxes: taxes.map((row) => ({
      ...row,
      createdAt: iso(row.createdAt),
    })) as DealDetail["taxes"],
    paymentSchedule: paymentSchedule.map((row) => ({
      ...row,
      createdAt: iso(row.createdAt),
    })) as DealDetail["paymentSchedule"],
    paymentAllocations: paymentAllocations.map((row) => ({
      ...row.deal_payment_allocations,
      createdAt: iso(row.deal_payment_allocations.createdAt),
    })) as DealDetail["paymentAllocations"],
    settlements: settlements.map((settlement) => ({
      ...settlement,
      createdAt: iso(settlement.createdAt),
    })) as DealDetail["settlements"],
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      entityType: log.entityType,
      entityId: log.entityId,
      doneBy: log.doneBy,
      doneByName: log.doneBy ? (actorNameMap.get(log.doneBy) ?? null) : null,
      entityLabel: null,
      createdAt: iso(log.createdAt),
    })) as DealDetail["auditLogs"],
  };
}

export async function getDealOptions(): Promise<{
  properties: Property[]
  users: DealOption[]
}> {
  const properties = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.status, "available"))
    .orderBy(desc(schema.properties.createdAt));

  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.roles.role,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .orderBy(schema.users.name);

  return {
    properties: properties.map((property) => ({
      ...property,
      createdAt: iso(property.createdAt),
      updatedAt: iso(property.updatedAt),
    })) as unknown as Property[],
    users: users as unknown as DealOption[],
  };
}

export async function getActorName(id: UUID): Promise<string | null> {
  const [user] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return user?.name ?? null;
}

export async function listDealsByProperty(
  user: SessionUser,
  propertyId: string,
): Promise<DealSummary[]> {
  const rows = await db
    .select({
      deal: schema.deals,
      counterpartyName: schema.users.name,
    })
    .from(schema.deals)
    .leftJoin(schema.users, eq(schema.users.id, schema.deals.counterpartyId))
    .where(eq(schema.deals.propertyId, propertyId))
    .orderBy(desc(schema.deals.createdAt));

  const viewable = (deal: (typeof rows)[number]["deal"]) => {
    if (user.role === "admin") return true
    return (
      deal.counterpartyId === user.id ||
      deal.sellerId === user.id ||
      deal.createdBy === user.id
    )
  }

  return rows
    .filter((row) => viewable(row.deal))
    .map((row) => ({
      id: row.deal.id,
      type: row.deal.type,
      status: row.deal.status,
      totalAmount: row.deal.totalAmount ?? "0",
      taxAmount: row.deal.taxAmount,
      counterpartyName: row.counterpartyName ?? null,
      createdAt: iso(row.deal.createdAt),
    }));
}