import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MaintenanceRequest, Property } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

export async function listMaintenances(): Promise<MaintenanceRequest[]> {
  const rows = await db
    .select({
      maintenance: schema.maintenance,
      propertyTitle: schema.properties.title,
      assignedName: schema.users.name,
    })
    .from(schema.maintenance)
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.maintenance.propertyId),
    )
    .leftJoin(schema.users, eq(schema.users.id, schema.maintenance.assignedTo))
    .orderBy(desc(schema.maintenance.createdAt));

  return rows.map((row) => ({
    id: row.maintenance.id,
    propertyId: row.maintenance.propertyId,
    propertyTitle: row.propertyTitle,
    title: row.maintenance.title,
    description: row.maintenance.description,
    priority: row.maintenance.priority,
    status: row.maintenance.status,
    assignedTo: row.maintenance.assignedTo,
    assignedName: row.assignedName ?? null,
    estimatedCost: row.maintenance.estimatedCost,
    actualCost: row.maintenance.actualCost,
    completedDate: row.maintenance.completedDate,
    createdAt: iso(row.maintenance.createdAt),
    updatedAt: iso(row.maintenance.updatedAt),
  }));
}

export async function listPropertyOptions(): Promise<Property[]> {
  const rows = await db
    .select()
    .from(schema.properties)
    .orderBy(asc(schema.properties.title));

  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}

export async function listAssigneeOptions(): Promise<
  Array<{ id: string; name: string }>
> {
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .orderBy(asc(schema.users.name));
}