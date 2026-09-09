import { z } from "zod";

export const documentSchema = z.object({
  entityId: z.string().min(1, "Property is required."),
  name: z.string().trim().min(1, "Name is required.").max(500),
  file: z.custom<File>(),
});

export type DocumentFormValues = z.infer<typeof documentSchema>;

export const documentDefaults: DocumentFormValues = {
  entityId: "",
  name: "",
  file: undefined as unknown as File,
}