import "server-only";

import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

export type DbOrTransaction =
  | NodePgDatabase<any>
  | NodePgTransaction<any>;

type ActivityInsert = typeof schema.activity.$inferInsert;

export async function logActivity(
  db: DbOrTransaction,
  input: {
    action: ActivityInsert["action"]
    entityType: ActivityInsert["entityType"]
    entityId: ActivityInsert["entityId"]
    doneBy?: ActivityInsert["doneBy"]
    details?: ActivityInsert["details"]
  },
): Promise<void> {
  await db.insert(schema.activity).values({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    doneBy: input.doneBy,
    details: input.details,
  });
}