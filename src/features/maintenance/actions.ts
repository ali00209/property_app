"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { moneyString } from "@/lib/utils";
import type { ActionResult, MaintenanceRequest } from "@/types";
import {
  maintenanceSchema,
  type MaintenanceFormValues,
} from "./validations";

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

export async function createMaintenanceAction(
  values: MaintenanceFormValues,
): Promise<ActionResult<MaintenanceRequest>> {
  const actor = await requireRole("admin", "maintenance_staff");
  const parsed = maintenanceSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const data = parsed.data;
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.maintenance)
        .values({
          propertyId: data.propertyId,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          status: data.status,
          assignedTo: data.assignedTo || null,
          estimatedCost: data.estimatedCost
            ? moneyString(data.estimatedCost)
            : null,
          actualCost: data.actualCost ? moneyString(data.actualCost) : null,
          completedDate: data.completedDate || null,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "maintenance",
        entityId: inserted.id,
        doneBy: actor.id,
        details: JSON.stringify({ title: inserted.title }),
      });
      return inserted;
    });

    revalidatePath("/dashboard/maintenance");
    return { ok: true, data: { ...row, propertyTitle: "" } as unknown as MaintenanceRequest };
  } catch (error) {
    return catchResult(error, "Failed to create the maintenance request.");
  }
}

export async function updateMaintenanceAction(
  id: string,
  values: MaintenanceFormValues,
): Promise<ActionResult<MaintenanceRequest>> {
  const actor = await requireRole("admin", "maintenance_staff");
  const parsed = maintenanceSchema.partial().safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const data = parsed.data;
    const updates: Partial<typeof schema.maintenance.$inferInsert> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined)
      updates.description = data.description || null;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.status !== undefined) updates.status = data.status;
    if (data.propertyId !== undefined) updates.propertyId = data.propertyId;
    if (data.assignedTo !== undefined)
      updates.assignedTo = data.assignedTo || null;
    if (data.estimatedCost !== undefined)
      updates.estimatedCost = data.estimatedCost
        ? moneyString(data.estimatedCost)
        : null;
    if (data.actualCost !== undefined)
      updates.actualCost = data.actualCost ? moneyString(data.actualCost) : null;
    if (data.completedDate !== undefined)
      updates.completedDate = data.completedDate || null;

    const row = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.maintenance)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.maintenance.id, id))
        .returning();
      if (!updated) throw new Error("Maintenance request not found.");
      await logActivity(tx, {
        action: "update",
        entityType: "maintenance",
        entityId: id,
        doneBy: actor.id,
        details: JSON.stringify({ title: updated.title }),
      });
      return updated;
    });

    revalidatePath("/dashboard/maintenance");
    return { ok: true, data: { ...row, propertyTitle: "" } as unknown as MaintenanceRequest };
  } catch (error) {
    return catchResult(error, "Failed to update the maintenance request.");
  }
}

export async function deleteMaintenanceAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("admin", "maintenance_staff");
  try {
    await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(schema.maintenance)
        .where(eq(schema.maintenance.id, id))
        .returning({ id: schema.maintenance.id, title: schema.maintenance.title });
      if (!deleted) throw new Error("Maintenance request not found.");
      await logActivity(tx, {
        action: "delete",
        entityType: "maintenance",
        entityId: id,
        doneBy: actor.id,
        details: JSON.stringify({ title: deleted.title }),
      });
    });

    revalidatePath("/dashboard/maintenance");
    return { ok: true, data: { id } };
  } catch (error) {
    return catchResult(error, "Failed to delete the maintenance request.");
  }
}