import { z } from "zod";

export const propertySchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().optional().nullable(),
  type: z.string().min(1, "Property type is required."),
  price: z.coerce.number().positive("Enter a valid price."),
  monthlyRent: z.coerce
    .number()
    .positive("Enter a valid monthly rent.")
    .optional(),
  area: z.coerce.number().positive("Enter a valid area."),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  yearBuilt: z.coerce.number().int().positive().optional(),
  parcelNumber: z.string().optional(),
  ownerId: z.string().optional(),
  coverImage: z.custom<File | null>().nullable().optional(),
  documents: z.array(z.custom<File>()).optional(),
  country: z.string().min(1, "Country is required."),
  state: z.string().min(1, "State is required."),
  city: z.string().trim().min(1, "City is required."),
  street: z.string().trim().min(1, "Street is required."),
  locality: z.string().optional(),
  zipCode: z.string().trim().min(1, "ZIP code is required."),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  formattedAddress: z.string().optional(),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;