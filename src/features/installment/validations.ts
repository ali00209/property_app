import { z } from "zod";

export const installmentPlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  description: z.string().trim().max(5000).optional(),
  frequency: z.enum(["monthly", "quarterly", "annually"]).default("monthly"),
  termMonths: z
    .string()
    .min(1, "Term is required.")
    .refine(
      (value) => Number(value) > 0 && Number.isInteger(Number(value)),
      "Term must be a positive whole number of months.",
    ),
  downPaymentPercent: z
    .string()
    .min(1, "Down payment is required.")
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 100,
      "Down payment must be between 0 and 100%.",
    ),
  interestRate: z
    .string()
    .min(1, "Markup is required.")
    .refine((value) => Number(value) >= 0, "Markup must be non-negative."),
});

export type InstallmentPlanFormValues = z.infer<typeof installmentPlanSchema>;

export const planDefaults: InstallmentPlanFormValues = {
  name: "",
  description: "",
  frequency: "monthly",
  termMonths: "12",
  downPaymentPercent: "20",
  interestRate: "0",
}

export const assignmentSchema = z.object({
  propertyId: z.string().min(1, "Property is required."),
  price: z
    .string()
    .min(1, "Price is required.")
    .refine((value) => Number(value) > 0, "Price must be positive."),
  downPaymentAmount: z.string().optional(),
  installmentAmount: z.string().optional(),
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export const assignmentDefaults: AssignmentFormValues = {
  propertyId: "",
  price: "",
  downPaymentAmount: "",
  installmentAmount: "",
}