import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ActivityItem } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

export async function listActivities(limit = 200): Promise<ActivityItem[]> {
  const rows = await db
    .select()
    .from(schema.activity)
    .orderBy(desc(schema.activity.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const actorIds = [
    ...new Set(rows.map((row) => row.doneBy).filter(Boolean) as string[]),
  ];
  const actors =
    actorIds.length > 0
      ? await db
          .select({ id: schema.users.id, name: schema.users.name })
          .from(schema.users)
          .where(inArray(schema.users.id, actorIds))
      : [];
  const actorMap = new Map(actors.map((actor) => [actor.id, actor.name]));

  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const ids = groups.get(row.entityType) ?? [];
    ids.push(row.entityId);
    groups.set(row.entityType, ids);
  }

  const labelMap = new Map<string, string>();
  for (const [entityType, ids] of groups) {
    const uniqueIds = [...new Set(ids)];
    if (entityType === "deals") {
      const list = await db
        .select({ id: schema.deals.id, title: schema.properties.title })
        .from(schema.deals)
        .innerJoin(
          schema.properties,
          eq(schema.properties.id, schema.deals.propertyId),
        )
        .where(inArray(schema.deals.id, uniqueIds));
      for (const row of list) labelMap.set(row.id, `Deal · ${row.title}`)
      continue
    }
    if (entityType === "properties" || entityType === "maintenance") {
      const table =
        entityType === "properties" ? schema.properties : schema.maintenance
      const list = await db
        .select({ id: table.id, title: table.title })
        .from(table)
        .where(inArray(table.id, uniqueIds));
      for (const row of list) labelMap.set(row.id, row.title)
    } else if (entityType === "users" || entityType === "documents") {
      const table = entityType === "users" ? schema.users : schema.documents
      const list = await db
        .select({ id: table.id, name: table.name })
        .from(table)
        .where(inArray(table.id, uniqueIds));
      for (const row of list) labelMap.set(row.id, row.name)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    details: (row.details ?? null) as Record<string, unknown> | null,
    entityType: row.entityType,
    entityId: row.entityId,
    doneBy: row.doneBy,
    doneByName: row.doneBy ? (actorMap.get(row.doneBy) ?? null) : null,
    entityLabel: labelMap.get(row.entityId) ?? null,
    createdAt: iso(row.createdAt),
  }));
}