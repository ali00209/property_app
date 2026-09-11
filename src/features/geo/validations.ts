import { z } from "zod";
import { areaUnitString, unitTypeString, societyKindString } from "@/lib/constants";

export const citySchema = z.object({
  name: z.string().trim().min(1, "City name is required.").max(100),
  province: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export const societySchema = z.object({
  cityId: z.string().uuid("City is required."),
  name: z.string().trim().min(1, "Name is required.").max(150),
  kind: z.enum(societyKindString),
  developer: z
    .string()
    .trim()
    .max(150)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  regulatoryAuthority: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  boundary: z.string().optional().default(""),
  isActive: z.boolean().default(true),
});

export const sectorSchema = z.object({
  societyId: z.string().uuid("Society is required."),
  name: z.string().trim().min(1, "Sector name is required.").max(100),
});

export const unitSchema = z.object({
  sectorId: z.string().uuid("Sector is required."),
  unitNumber: z.string().trim().min(1, "Unit number is required.").max(50),
  streetNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  lat: z.string().optional().default(""),
  lng: z.string().optional().default(""),
  areaValue: z.coerce.number().nonnegative().optional().nullable(),
  areaUnit: z
    .enum(areaUnitString)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  type: z
    .enum(unitTypeString)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
});

export type CityFormValues = z.infer<typeof citySchema>;
export type SocietyFormValues = z.infer<typeof societySchema>;
export type SectorFormValues = z.infer<typeof sectorSchema>;
export type UnitFormValues = z.infer<typeof unitSchema>;

export const cityDefaults: CityFormValues = { name: "", province: null };
export const societyDefaults: SocietyFormValues = {
  cityId: "",
  name: "",
  kind: "general_locality",
  developer: null,
  regulatoryAuthority: null,
  boundary: "",
  isActive: true,
};
export const sectorDefaults: SectorFormValues = { societyId: "", name: "" };
export const unitDefaults: UnitFormValues = {
  sectorId: "",
  unitNumber: "",
  streetNumber: null,
  lat: "",
  lng: "",
  areaValue: null,
  areaUnit: null,
  type: null,
};