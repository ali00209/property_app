"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { ActionResult, User } from "@/types";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "./validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown, context: string): ActionResult<never> {
  const message = e instanceof Error && e.message ? e.message : context;
  if (message.toLowerCase().includes("foreign key")) {
    return errorResult("User cannot be deleted; they are referenced by existing records.");
  }
  return errorResult(message);
}

export async function createUserAction(
  values: CreateUserFormValues,
): Promise<ActionResult<User>> {
  const actor = await requireRole("admin");
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const email = parsed.data.email ?? null;
    const phone = parsed.data.phone ?? null;
    if (email) {
      const [existing] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email));
      if (existing) throw new Error("An account with this email already exists.");
    }
    if (phone) {
      const [existing] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.phone, phone));
      if (existing) {
        throw new Error("An account with this phone number already exists.");
      }
    }

    const [role] = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.role, parsed.data.role))
      .limit(1);
    if (!role) throw new Error("Role not found.");

    const password = await hashPassword(parsed.data.password);
    const user = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.users)
        .values({
          name: parsed.data.name,
          email,
          password,
          roleId: role.id,
          phone,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "users",
        entityId: row.id,
        doneBy: actor.id,
        details: JSON.stringify({ email }),
      });
      return row;
    });

    revalidatePath("/dashboard/users");
    return {
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: parsed.data.role,
        roleId: user.roleId,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    return catchResult(error, "Failed to create the user.");
  }
}

export async function updateUserAction(
  id: string,
  values: UpdateUserFormValues,
): Promise<ActionResult<User>> {
  const actor = await requireRole("admin");
  const parsed = updateUserSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (!existing) throw new Error("User not found.");

    if (parsed.data.email !== undefined && parsed.data.email) {
      const [already] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, parsed.data.email));
      if (already && already.id !== id) {
        throw new Error("An account with this email already exists.");
      }
    }

    if (parsed.data.phone !== undefined && parsed.data.phone) {
      const [already] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.phone, parsed.data.phone));
      if (already && already.id !== id) {
        throw new Error("An account with this phone number already exists.");
      }
    }

    const [existingRole] = await db
      .select({ role: schema.roles.role })
      .from(schema.roles)
      .where(eq(schema.roles.id, existing.roleId))
      .limit(1);

    const updates: Partial<typeof schema.users.$inferInsert> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.email !== undefined)
      updates.email = parsed.data.email ?? null;
    if (parsed.data.phone !== undefined)
      updates.phone = parsed.data.phone ?? null;

    const finalEmail =
      updates.email !== undefined ? updates.email : existing.email;
    const finalPhone =
      updates.phone !== undefined ? updates.phone : existing.phone;
    if (!finalEmail && !finalPhone) {
      throw new Error("User must have an email or phone number.");
    }

    if (parsed.data.password) {
      updates.password = await hashPassword(parsed.data.password);
    }
    if (parsed.data.role !== undefined) {
      const [role] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.role, parsed.data.role))
        .limit(1);
      if (!role) throw new Error("Role not found.");
      updates.roleId = role.id;
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning();
      await logActivity(tx, {
        action: "update",
        entityType: "users",
        entityId: id,
        doneBy: actor.id,
        details: JSON.stringify({ email: updates.email ?? existing.email }),
      });
      return row;
    });

    revalidatePath("/dashboard/users");
    return {
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: parsed.data.role ?? existingRole?.role ?? "client",
        roleId: updated.roleId,
        avatarUrl: updated.avatarUrl,
        phone: updated.phone,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    return catchResult(error, "Failed to update the user.");
  }
}

export async function deleteUserAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("admin");
  try {
    if (id === actor.id) {
      throw new Error("You cannot delete your own account.");
    }

    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (!row) throw new Error("User not found.");

    const [roleRow] = await db
      .select({ role: schema.roles.role })
      .from(schema.roles)
      .where(eq(schema.roles.id, row.roleId))
      .limit(1);
    if (roleRow?.role === "admin") {
      const [adminCount] = await db
        .select({ total: count() })
        .from(schema.users)
        .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
        .where(eq(schema.roles.role, "admin"));
      if ((adminCount?.total ?? 0) <= 1) {
        throw new Error("Cannot delete the last admin account.");
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(schema.users).where(eq(schema.users.id, id));
      await logActivity(tx, {
        action: "delete",
        entityType: "users",
        entityId: id,
        doneBy: actor.id,
        details: JSON.stringify({ email: row.email }),
      });
    });

    revalidatePath("/dashboard/users");
    return { ok: true, data: { id } };
  } catch (error) {
    return catchResult(error, "Failed to delete the user.");
  }
}