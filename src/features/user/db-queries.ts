import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

export async function listUsers(): Promise<User[]> {
  const rows = await db
    .select({
      user: schema.users,
      roleName: schema.roles.role,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .orderBy(desc(schema.users.createdAt));

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.roleName,
    roleId: row.user.roleId,
    avatarUrl: row.user.avatarUrl,
    phone: row.user.phone,
    createdAt: iso(row.user.createdAt),
    updatedAt: iso(row.user.updatedAt),
  }));
}

export async function listRoleOptions(): Promise<
  Array<{ id: string; role: string }>
> {
  return db
    .select({ id: schema.roles.id, role: schema.roles.role })
    .from(schema.roles)
    .orderBy(schema.roles.role);
}