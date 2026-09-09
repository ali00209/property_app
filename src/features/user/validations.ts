import { z } from "zod";

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

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email.")
    .max(255),
  phone: z.string().trim().max(50).optional(),
  role: z.enum(USER_ROLES),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const createUserDefaults: CreateUserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: "client",
  password: "",
}

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email.")
    .max(255)
    .optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  role: z.enum(USER_ROLES).optional(),
  password: z
    .string()
    .refine((value) => value === "" || value.length >= 6, {
      message: "Password must be at least 6 characters.",
    })
    .optional(),
});

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;