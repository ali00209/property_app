import "server-only";

import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { PaymentLedgerRow } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

const counterparty = alias(schema.users, "counterparty");
const recorder = alias(schema.users, "recorder");

export async function listDealPayments(): Promise<PaymentLedgerRow[]> {
  const rows = await db
    .select({
      payment: schema.dealPayments,
      propertyTitle: schema.properties.title,
      dealType: schema.deals.type,
      dealStatus: schema.deals.status,
      counterpartyName: counterparty.name,
      recordedByName: recorder.name,
    })
    .from(schema.dealPayments)
    .innerJoin(schema.deals, eq(schema.deals.id, schema.dealPayments.dealId))
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.deals.propertyId),
    )
    .leftJoin(
      counterparty,
      eq(counterparty.id, schema.deals.counterpartyId),
    )
    .leftJoin(recorder, eq(recorder.id, schema.dealPayments.recordedBy))
    .orderBy(desc(schema.dealPayments.createdAt));

  return rows.map((row) => ({
    id: row.payment.id,
    dealId: row.payment.dealId,
    propertyTitle: row.propertyTitle,
    dealType: row.dealType,
    dealStatus: row.dealStatus,
    counterpartyName: row.counterpartyName ?? null,
    amount: row.payment.amount,
    principalAmount: row.payment.principalAmount,
    taxAmount: row.payment.taxAmount,
    status: row.payment.status,
    paymentMethod: row.payment.paymentMethod,
    reference: row.payment.reference,
    notes: row.payment.notes,
    recordedByName: row.recordedByName ?? null,
    reversedAt: iso(row.payment.reversedAt),
    createdAt: iso(row.payment.createdAt),
  }));
}