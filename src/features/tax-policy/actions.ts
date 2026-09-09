"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import type { ActionResult, TaxPolicy } from "@/types";
import {
  taxPolicySchema,
  type TaxPolicyFormValues,
} from "./validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown, context: string): ActionResult<never> {
  const message =
    e instanceof Error && e.message ? e.message : context;
  if (e && typeof e === "object" && "code" in e && e.code === "23505") {
    return errorResult("A policy with that name already exists.");
  }
  return errorResult(message);
}

const IMMUTABLE_FIELDS = [
  "name",
  "kind",
  "value",
  "appliesTo",
  "effectiveStart",
  "effectiveEnd",
] as const;

export async function createTaxPolicyAction(
  values: TaxPolicyFormValues,
): Promise<ActionResult<TaxPolicy>> {
  const actor = await requireRole("admin");
  const parsed = taxPolicySchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [policy] = await db
      .insert(schema.taxPolicies)
      .values({
        name: parsed.data.name,
        kind: parsed.data.kind,
        value: parsed.data.value,
        appliesTo: parsed.data.appliesTo,
        active: parsed.data.active,
        effectiveStart: parsed.data.effectiveStart || null,
        effectiveEnd: parsed.data.effectiveEnd || null,
        code: parsed.data.code || null,
        authority: parsed.data.authority || null,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
        createdBy: actor.id,
      })
      .returning();
    revalidatePath("/dashboard/tax-policies");
    return { ok: true, data: policy as unknown as TaxPolicy };
  } catch (error) {
    return catchResult(error, "Failed to create the tax policy.");
  }
}

export async function updateTaxPolicyAction(
  id: string,
  values: Partial<TaxPolicyFormValues>,
): Promise<ActionResult<TaxPolicy>> {
  await requireRole("admin");
  const parsed = taxPolicySchema.partial().safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [existing] = await db
      .select({ id: schema.taxPolicies.id })
      .from(schema.taxPolicies)
      .where(eq(schema.taxPolicies.id, id));
    if (!existing) return errorResult("Tax policy not found.");

    if (Object.keys(parsed.data).length > 0) {
      const [used] = await db
        .select({ id: schema.dealTaxSnapshots.id })
        .from(schema.dealTaxSnapshots)
        .where(eq(schema.dealTaxSnapshots.policyId, id))
        .limit(1);
      const touchesFinancials = IMMUTABLE_FIELDS.some(
        (field) => parsed.data[field] !== undefined,
      );
      if (used && touchesFinancials) {
        return errorResult(
          "Used tax policies cannot change financial or applicability fields — create a new version instead.",
        );
      }
    }

    const set = {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.kind !== undefined && { kind: parsed.data.kind }),
      ...(parsed.data.value !== undefined && { value: parsed.data.value }),
      ...(parsed.data.appliesTo !== undefined && {
        appliesTo: parsed.data.appliesTo,
      }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(parsed.data.effectiveStart !== undefined && {
        effectiveStart: parsed.data.effectiveStart || null,
      }),
      ...(parsed.data.effectiveEnd !== undefined && {
        effectiveEnd: parsed.data.effectiveEnd || null,
      }),
      ...(parsed.data.code !== undefined && {
        code: parsed.data.code || null,
      }),
      ...(parsed.data.authority !== undefined && {
        authority: parsed.data.authority || null,
      }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description || null,
      }),
      ...(parsed.data.notes !== undefined && {
        notes: parsed.data.notes || null,
      }),
      updatedAt: new Date(),
    }

    const [policy] = await db
      .update(schema.taxPolicies)
      .set(set)
      .where(eq(schema.taxPolicies.id, id))
      .returning();
    revalidatePath("/dashboard/tax-policies");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: policy as unknown as TaxPolicy };
  } catch (error) {
    return catchResult(error, "Failed to update the tax policy.");
  }
}

export async function toggleTaxPolicyAction(
  id: string,
  active: boolean,
): Promise<ActionResult<TaxPolicy>> {
  await requireRole("admin");
  try {
    const [policy] = await db
      .update(schema.taxPolicies)
      .set({ active, updatedAt: new Date() })
      .where(eq(schema.taxPolicies.id, id))
      .returning();
    if (!policy) return errorResult("Tax policy not found.");
    revalidatePath("/dashboard/tax-policies");
    revalidatePath("/dashboard/deals");
    return { ok: true, data: policy as unknown as TaxPolicy };
  } catch (error) {
    return catchResult(error, "Failed to update the tax policy.");
  }
}

export async function setPropertyTaxAssignmentAction(
  propertyId: string,
  policyId: string,
  assigned: boolean,
): Promise<ActionResult<{ propertyId: string }>> {
  const actor = await requireRole("admin");
  try {
    if (assigned) {
      const [policy] = await db
        .select({ id: schema.taxPolicies.id })
        .from(schema.taxPolicies)
        .where(
          and(eq(schema.taxPolicies.id, policyId), eq(schema.taxPolicies.active, true)),
        );
      if (!policy) return errorResult("Active tax policy not found.");
      await db.insert(schema.propertyTaxAssignments).values({
        propertyId,
        policyId,
        createdBy: actor.id,
      });
    } else {
      await db
        .delete(schema.propertyTaxAssignments)
        .where(
          and(
            eq(schema.propertyTaxAssignments.propertyId, propertyId),
            eq(schema.propertyTaxAssignments.policyId, policyId),
          ),
        );
    }
    revalidatePath(`/dashboard/properties/${propertyId}`);
    revalidatePath("/dashboard/deals");
    return { ok: true, data: { propertyId } };
  } catch (error) {
    return catchResult(error, "Failed to update the property tax assignment.");
  }
}