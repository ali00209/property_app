import { z } from "zod";

export const requestSchema = z.object({
  propertyPlanId: z.string().min(1, "A plan is required."),
  note: z.string().max(2000),
});

export type RequestFormValues = z.infer<typeof requestSchema>;

export const requestDefaults: RequestFormValues = {
  propertyPlanId: "",
  note: "",
};

export const rejectRequestSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required.").max(2000),
});

export type RejectRequestValues = z.infer<typeof rejectRequestSchema>;