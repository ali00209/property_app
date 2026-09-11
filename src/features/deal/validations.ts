import { z } from "zod";

export const dealFormSchema = z
  .object({
    propertyId: z.string().min(1, "Property is required."),
    type: z.enum([
      "cash_sale",
      "fixed_lease",
      "periodic_rent",
      "installment_purchase",
    ]),
    counterpartyId: z.string().min(1, "Counterparty is required."),
    taxPolicyId: z.union([z.literal(""), z.string().uuid()]).optional(),
    currency: z.string().trim().min(1, "Currency is required.").default("PKR"),
    startsOn: z.string().optional(),
    endsOn: z.string().optional(),
    dueOn: z.string().optional(),
    totalAmount: z.string().optional(),
    earnestAmount: z.string().optional(),
    paymentMethod: z.string().optional(),
    rentAmount: z.string().optional(),
    depositAmount: z.string().optional(),
    advanceRentMonths: z.string().optional(),
    noticePeriodDays: z.string().optional(),
    downPaymentAmount: z.string().optional(),
    installmentAmount: z.string().optional(),
    installmentCount: z.string().optional(),
    frequency: z
      .enum(["monthly", "quarterly", "annually"])
      .optional()
      .default("monthly"),
    notes: z.string().max(5000).optional(),
  })
  .superRefine((values, context) => {
    const required = (field: keyof typeof values, message: string) => {
      if (!values[field]) {
        context.addIssue({ code: "custom", path: [field], message });
      }
    };

    if (values.type === "cash_sale") {
      required("totalAmount", "Total amount is required for a cash sale.");
    }
    if (values.type === "fixed_lease") {
      required("startsOn", "Start date is required.");
      required("endsOn", "End date is required.");
      required("rentAmount", "Rent amount is required.");
    }
    if (values.type === "periodic_rent") {
      required("startsOn", "Start date is required.");
      required("rentAmount", "Rent amount is required.");
    }
    if (values.type === "installment_purchase") {
      required("downPaymentAmount", "Down payment is required.");
      required("installmentAmount", "Installment amount is required.");
      required("installmentCount", "Number of installments is required.");
    }
    for (const field of [
      "totalAmount",
      "rentAmount",
      "depositAmount",
      "downPaymentAmount",
      "installmentAmount",
    ] as const) {
      const value = values[field];
      if (value && Number(value) < 0) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Amount must be non-negative.",
        });
      }
    }
    if (
      values.installmentCount &&
      Number(values.installmentCount) < 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["installmentCount"],
        message: "At least one installment is required.",
      });
    }
    if (
      values.startsOn &&
      values.endsOn &&
      new Date(values.endsOn) <= new Date(values.startsOn)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date must be after the start date.",
      });
    }
  });

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((value) => Number(value) > 0, "Amount must be positive."),
  paymentMethod: z.string().max(50).optional(),
  reference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const settlementSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required.").max(2000),
  refundAmount: z.string().optional(),
});

export type SettlementFormValues = z.infer<typeof settlementSchema>;