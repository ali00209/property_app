import { z } from "zod";

export const taxPolicySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(255),
    kind: z.enum(["percentage", "fixed_amount"]),
    value: z
      .string()
      .min(1, "Value is required.")
      .refine((value) => Number(value) >= 0, "Value must be non-negative."),
    appliesTo: z
      .array(
        z.enum([
          "cash_sale",
          "installment_purchase",
          "fixed_lease",
          "periodic_rent",
        ]),
      )
      .min(1, "Pick at least one deal type."),
    active: z.boolean().default(true),
    effectiveStart: z.string().optional(),
    effectiveEnd: z.string().optional(),
    code: z.string().trim().max(100).optional(),
    authority: z.string().trim().max(255).optional(),
    description: z.string().trim().max(5000).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .superRefine((values, context) => {
    if (values.kind === "percentage" && Number(values.value) > 100) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot exceed 100.",
      });
    }
    if (
      values.effectiveStart &&
      values.effectiveEnd &&
      values.effectiveEnd < values.effectiveStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveEnd"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export type TaxPolicyFormValues = z.infer<typeof taxPolicySchema>;

export const defaults: TaxPolicyFormValues = {
  name: "",
  kind: "percentage",
  value: "",
  appliesTo: [],
  active: true,
  effectiveStart: undefined,
  effectiveEnd: undefined,
  code: "",
  authority: "",
  description: "",
  notes: "",
}

