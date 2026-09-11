import { z } from "zod";

export const featureRowSchema = z.object({
  feature: z.string().trim().min(1, "Feature name is required.").max(100),
  value: z.string().trim().max(500),
});

export const ownerRowSchema = z
  .object({
    mode: z.enum(["existing", "new"]),
    ownerId: z.string().uuid("Select an owner.").optional(),
    name: z.string().trim().max(255).optional(),
    email: z.string().trim().email("Enter a valid email.").max(255).optional(),
    phone: z.string().trim().max(50).optional(),
    ownershipPercentage: z.coerce.number().int().min(1).max(100),
  })
  .superRefine((row, ctx) => {
    if (row.mode === "existing" && !row.ownerId) {
      ctx.addIssue({
        code: "custom",
        path: ["ownerId"],
        message: "Select an owner.",
      });
    }
    if (row.mode === "new") {
      if (!row.name) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: "Owner name is required.",
        });
      }
      if (!row.email && !row.phone) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Provide an email or phone.",
        });
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Provide an email or phone.",
        });
      }
    }
  });

export const ownerListSchema = z
  .array(ownerRowSchema)
  .superRefine((rows, ctx) => {
    if (rows.length > 0) {
      const sum = rows.reduce((total, row) => total + row.ownershipPercentage, 0);
      if (sum !== 100) {
        ctx.addIssue({
          code: "custom",
          path: [],
          message: "Ownership percentages must add up to 100.",
        });
      }
    }
  });

export const propertySchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(500),
  description: z.string().optional().nullable(),
  listingPurpose: z.enum(["sale", "rent"]).default("sale"),
  price: z.coerce.number().positive("Enter a valid price."),
  monthlyRent: z.coerce
    .number()
    .positive("Enter a valid monthly rent.")
    .optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  yearBuilt: z.coerce.number().int().positive().optional(),
  isBalloted: z.boolean().default(false),
  fbrValuation: z.coerce.number().nonnegative().optional(),
  dcRate: z.coerce.number().nonnegative().optional(),
  parcelNumber: z.string().optional(),
  cityId: z.string().uuid("City is required."),
  unitId: z.string().uuid("Unit is required."),
  images: z.array(z.custom<File>()).max(10).optional(),
  documents: z.array(z.custom<File>()).max(20).optional(),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;