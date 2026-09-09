import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type {
  InstallmentAssignment,
  InstallmentPlan,
  Property,
  PublishedPlanAssignment,
  PurchaseRequest,
} from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const buyer = alias(schema.users, "buyer");
const reviewer = alias(schema.users, "reviewer");

export async function listInstallmentPlans(): Promise<InstallmentPlan[]> {
  const rows = await db
    .select()
    .from(schema.installmentPlanTemplates)
    .orderBy(desc(schema.installmentPlanTemplates.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}

export async function listPropertyInstallmentAssignments(
  propertyId: string,
): Promise<InstallmentAssignment[]> {
  const rows = await db
    .select({
      assignment: schema.propertyInstallmentPlans,
      propertyTitle: schema.properties.title,
      planName: schema.installmentPlanTemplates.name,
    })
    .from(schema.propertyInstallmentPlans)
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.propertyInstallmentPlans.propertyId),
    )
    .innerJoin(
      schema.installmentPlanTemplates,
      eq(
        schema.installmentPlanTemplates.id,
        schema.propertyInstallmentPlans.templateId,
      ),
    )
    .where(eq(schema.propertyInstallmentPlans.propertyId, propertyId))
    .orderBy(desc(schema.propertyInstallmentPlans.createdAt));

  return rows.map((row) => ({
    ...row.assignment,
    propertyTitle: row.propertyTitle,
    planName: row.planName,
    createdAt: iso(row.assignment.createdAt) ?? "",
    updatedAt: iso(row.assignment.updatedAt) ?? "",
  }));
}

export async function listAssignableProperties(): Promise<Property[]> {
  const rows = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.status, "available"))
    .orderBy(desc(schema.properties.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}

export async function listPublishedAssignments(): Promise<
  PublishedPlanAssignment[]
> {
  const rows = await db
    .select({
      assignment: schema.propertyInstallmentPlans,
      plan: schema.installmentPlanTemplates,
      propertyTitle: schema.properties.title,
    })
    .from(schema.propertyInstallmentPlans)
    .innerJoin(
      schema.installmentPlanTemplates,
      eq(
        schema.installmentPlanTemplates.id,
        schema.propertyInstallmentPlans.templateId,
      ),
    )
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.propertyInstallmentPlans.propertyId),
    )
    .where(
      and(
        eq(schema.propertyInstallmentPlans.status, "published"),
        eq(schema.installmentPlanTemplates.status, "published"),
        eq(schema.properties.status, "available"),
      ),
    )
    .orderBy(desc(schema.propertyInstallmentPlans.createdAt));

  return rows.map((row) => ({
    id: row.assignment.id,
    propertyId: row.assignment.propertyId,
    propertyTitle: row.propertyTitle,
    planName: row.plan.name,
    price: row.assignment.price,
    downPaymentAmount: row.assignment.downPaymentAmount,
    installmentAmount: row.assignment.installmentAmount,
    frequency: row.plan.frequency,
    termMonths: row.plan.termMonths,
    downPaymentPercent: row.plan.downPaymentPercent,
    interestRate: row.plan.interestRate,
  }));
}

export async function listPurchaseRequests(
  userId: string | null,
): Promise<PurchaseRequest[]> {
  const rows = await db
    .select({
      request: schema.purchaseRequests,
      propertyTitle: schema.properties.title,
      planName: schema.installmentPlanTemplates.name,
      assignment: schema.propertyInstallmentPlans,
      buyerName: buyer.name,
      reviewedByName: reviewer.name,
    })
    .from(schema.purchaseRequests)
    .innerJoin(
      schema.propertyInstallmentPlans,
      eq(
        schema.propertyInstallmentPlans.id,
        schema.purchaseRequests.propertyPlanId,
      ),
    )
    .innerJoin(
      schema.installmentPlanTemplates,
      eq(
        schema.installmentPlanTemplates.id,
        schema.propertyInstallmentPlans.templateId,
      ),
    )
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.purchaseRequests.propertyId),
    )
    .innerJoin(buyer, eq(buyer.id, schema.purchaseRequests.buyerId))
    .leftJoin(reviewer, eq(reviewer.id, schema.purchaseRequests.reviewedBy))
    .where(userId ? eq(schema.purchaseRequests.buyerId, userId) : undefined)
    .orderBy(desc(schema.purchaseRequests.createdAt));

  return rows.map((row) => ({
    id: row.request.id,
    propertyId: row.request.propertyId,
    propertyTitle: row.propertyTitle,
    planName: row.planName,
    price: row.assignment.price,
    downPaymentAmount: row.assignment.downPaymentAmount,
    installmentAmount: row.assignment.installmentAmount,
    buyerName: row.buyerName,
    status: row.request.status,
    note: row.request.note,
    rejectionReason: row.request.rejectionReason,
    reviewedByName: row.reviewedByName ?? null,
    createdAt: iso(row.request.createdAt) ?? "",
  }));
}