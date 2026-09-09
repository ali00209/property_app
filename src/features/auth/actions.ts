"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  clearSessionCookie,
  setSessionCookie,
  signSession,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionResult, SessionUser } from "@/types";
import { loginSchema, registerSchema } from "./validations";
import type { LoginFormValues, RegisterFormValues } from "./validations";

async function findUserByEmail(email: string) {
  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      password: schema.users.password,
      role: schema.roles.role,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.email, email));
  return row;
}

export async function loginAction(
  values: LoginFormValues,
): Promise<ActionResult<SessionUser>> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Please fix the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { ok: false, error: { message: "Invalid email or password." } };
  }

  const session: SessionUser = { id: user.id, name: user.name, email: user.email, role: user.role as SessionUser["role"] };  await setSessionCookie(signSession(session));
  revalidatePath("/", "layout");

  return { ok: true, data: session };
}

export async function registerAction(
  values: RegisterFormValues,
): Promise<ActionResult<SessionUser>> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Please fix the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  if (await findUserByEmail(email)) {
    return { ok: false, error: { message: "An account with this email already exists." } };
  }

  const [clientRole] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.role, "client"));
  if (!clientRole) {
    return { ok: false, error: { message: "Registration is currently unavailable." } };
  }

  const password = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: parsed.data.name.trim(),
      email,
      password,
      roleId: clientRole.id,
    })
    .returning({ id: schema.users.id });

  const session: SessionUser = {
    id: user.id,
    name: parsed.data.name.trim(),
    email,
    role: "client",
  };
  await setSessionCookie(signSession(session));
  revalidatePath("/", "layout");

  return { ok: true, data: session };
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}