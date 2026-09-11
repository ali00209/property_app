"use server";

import { db, schema } from "@/db";
import { clearSessionCookie, setSessionCookie, signSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionResult, SessionUser } from "@/types";
import { eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LoginFormValues, RegisterFormValues } from "./validations";
import { loginSchema, registerSchema, parseIdentifier } from "./validations";

async function findUserByEmailOrPhone(email?: string, phone?: string) {
  const conditions = [];
  if (email) conditions.push(eq(schema.users.email, email));
  if (phone) conditions.push(eq(schema.users.phone, phone));

  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      password: schema.users.password,
      role: schema.roles.role,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(or(...conditions));
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

  const { email, phone } = parseIdentifier(parsed.data.identifier);

  const user = await findUserByEmailOrPhone(email, phone);
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { ok: false, error: { message: "Invalid email/phone or password." } };
  }

  const session: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as SessionUser["role"],
  };
  await setSessionCookie(signSession(session));
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

  const { email, phone } = parseIdentifier(parsed.data.identifier);

  const existingUser = await findUserByEmailOrPhone(email, phone);
  if (existingUser) {
    return {
      ok: false,
      error: {
        message: email
          ? "An account with this email already exists."
          : phone
            ? "An account with this phone number already exists."
            : "Account already exists.",
      },
    };
  }

  const [clientRole] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.role, "client"));
  if (!clientRole) {
    return {
      ok: false,
      error: { message: "Registration is currently unavailable." },
    };
  }

  const password = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: parsed.data.name.trim(),
      email: email ?? null,
      phone: phone ?? null,
      password,
      roleId: clientRole.id,
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      phone: schema.users.phone,
    });

  const session: SessionUser = {
    id: user.id,
    name: parsed.data.name.trim(),
    email: user.email,
    phone: user.phone,
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