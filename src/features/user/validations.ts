import { z } from "zod";
import { isPakistaniMobile, normalizePhone } from "@/lib/phone";

export const USER_ROLES = [
  "admin",
  "client",
  "tenant",
  "property_manager",
  "accountant",
  "owner",
  "maintenance_staff",
] as const;

export const userRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client" },
  { value: "tenant", label: "Tenant" },
  { value: "property_manager", label: "Property Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "owner", label: "Owner" },
  { value: "maintenance_staff", label: "Maintenance Staff" },
];

const optionalEmail = z
  .union([
    z.literal(""),
    z.string().trim().toLowerCase().email("Enter a valid email.").max(255),
  ])
  .transform((value) => (value === "" ? null : value))
  .optional();

const optionalPhone = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .refine(
        isPakistaniMobile,
        "Enter a valid mobile number (e.g. 03XXXXXXXXX).",
      ),
  ])
  .transform((value) => (value === "" ? null : normalizePhone(value)))
  .optional();

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(255),
    email: optionalEmail,
    phone: optionalPhone,
    role: z.enum(USER_ROLES),
    password: z.string().min(6, "Password must be at least 6 characters."),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Provide an email or phone number.",
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const createUserDefaults: CreateUserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: "client",
  password: "",
}

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(255).optional(),
    email: optionalEmail.nullable(),
    phone: optionalPhone.nullable(),
    role: z.enum(USER_ROLES).optional(),
    password: z
      .string()
      .refine((value) => value === "" || value.length >= 6, {
        message: "Password must be at least 6 characters.",
      })
      .optional(),
  });

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;