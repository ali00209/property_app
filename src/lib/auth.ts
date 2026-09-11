import "server-only";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import type { SessionUser, UserRole } from "@/types";

export const SESSION_COOKIE = "session";

const DEFAULT_SECRET = "dev-only-change-me";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

interface TokenPayload {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: UserRole;
}

function secret(): string {
  return process.env.JWT_SECRET ?? DEFAULT_SECRET;
}

function maxAgeSeconds(): number {
  const raw = process.env.JWT_EXPIRE_IN;
  if (!raw) return DEFAULT_MAX_AGE_SECONDS;
  const match = /^(\d+)([smhdw])$/i.exec(raw.trim());
  if (!match) return DEFAULT_MAX_AGE_SECONDS;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
  };
  return Number(match[1]) * multipliers[match[2].toLowerCase()];
}

export function signSession(user: SessionUser): string {
  const payload: TokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
  return jwt.sign(payload, secret(), {
    expiresIn: maxAgeSeconds(),
  });
}

export function verifySession(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, secret()) as TokenPayload;
    if (!payload.id || !payload.role) return null;
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) forbidden();
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}