import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DealTaxCandidates, PolicyMeta, TaxPolicy } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const toPolicyMeta = (row: typeof schema.taxPolicies.$inferSelect): PolicyMeta => ({
  id: row.id,
  name: row.name,
  kind: row.kind as PolicyMeta["kind"],
  value: row.value,
  appliesTo: row.appliesTo as PolicyMeta["appliesTo"],
  effectiveStart: row.effectiveStart,
  effectiveEnd: row.effectiveEnd,
  authority: row.authority,
});

export async function listTaxPolicies(): Promise<TaxPolicy[]> {
  const rows = await db
    .select()
    .from(schema.taxPolicies)
    .orderBy(desc(schema.taxPolicies.createdAt));

  return rows.map((row) => ({
    ...row,
    appliesTo: row.appliesTo as TaxPolicy["appliesTo"],
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}

export async function getTaxPolicy(id: string): Promise<TaxPolicy | null> {
  const [row] = await db
    .select()
    .from(schema.taxPolicies)
    .where(eq(schema.taxPolicies.id, id));
  if (!row) return null;
  return {
    ...row,
    appliesTo: row.appliesTo as TaxPolicy["appliesTo"],
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

export async function listActiveTaxPolicies(): Promise<TaxPolicy[]> {
  const rows = await db
    .select()
    .from(schema.taxPolicies)
    .where(eq(schema.taxPolicies.active, true))
    .orderBy(desc(schema.taxPolicies.createdAt));

  return rows.map((row) => ({
    ...row,
    appliesTo: row.appliesTo as TaxPolicy["appliesTo"],
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}

export async function listPropertyTaxAssignments(
  propertyId: string,
): Promise<TaxPolicy[]> {
  const rows = await db
    .select({ policy: schema.taxPolicies })
    .from(schema.propertyTaxAssignments)
    .innerJoin(
      schema.taxPolicies,
      eq(schema.taxPolicies.id, schema.propertyTaxAssignments.policyId),
    )
    .where(
      and(
        eq(schema.propertyTaxAssignments.propertyId, propertyId),
        eq(schema.taxPolicies.active, true),
      ),
    )
    .orderBy(schema.taxPolicies.createdAt);

  return rows.map((row) => ({
    ...row.policy,
    appliesTo: row.policy.appliesTo as TaxPolicy["appliesTo"],
    createdAt: iso(row.policy.createdAt) ?? "",
    updatedAt: iso(row.policy.updatedAt) ?? "",
  }));
}

export async function getTaxCandidates(): Promise<DealTaxCandidates> {
  const globalRows = await db
    .select()
    .from(schema.taxPolicies)
    .where(eq(schema.taxPolicies.active, true))
    .orderBy(schema.taxPolicies.createdAt);

  const assignments = await db
    .select({
      propertyId: schema.propertyTaxAssignments.propertyId,
      policy: schema.taxPolicies,
    })
    .from(schema.propertyTaxAssignments)
    .innerJoin(
      schema.taxPolicies,
      eq(schema.taxPolicies.id, schema.propertyTaxAssignments.policyId),
    )
    .where(eq(schema.taxPolicies.active, true));

  const byProperty: Record<string, PolicyMeta[]> = {};
  for (const row of assignments) {
    if (!byProperty[row.propertyId]) byProperty[row.propertyId] = []
    byProperty[row.propertyId].push(toPolicyMeta(row.policy))
  }

  return {
    byProperty,
    fallback: globalRows.map(toPolicyMeta),
  };
}