import { z } from "zod";
import { isPakistaniMobile, normalizePhone } from "@/lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required.")
  .refine(
    (value) =>
      value.includes("@") ? EMAIL_RE.test(value) : isPakistaniMobile(value),
    "Enter a valid email or mobile number (e.g. you@example.com or 03XXXXXXXXX).",
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  identifier: identifierSchema,
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function parseIdentifier(
  identifier: string,
): { email?: string; phone?: string } {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase() };
  }
  return { phone: normalizePhone(trimmed) };
}