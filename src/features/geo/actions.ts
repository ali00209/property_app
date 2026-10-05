"use server";

import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import type { ActionResult, City, Unit, Society, SocietySector } from "@/types";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import {
  citySchema,
  unitSchema,
  sectorSchema,
  societySchema,
  type CityFormValues,
  type UnitFormValues,
  type SectorFormValues,
  type SocietyFormValues,
} from "./validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown, message: string): ActionResult<never> {
  const detail = e instanceof Error && e.message ? e.message : message;
  if (e && typeof e === "object" && "code" in e && e.code === "23505") {
    return errorResult("A record with this name already exists.");
  }
  return errorResult(detail);
}

function revalidate() {
  revalidatePath("/dashboard/areas");
  revalidatePath("/dashboard/properties");
}

const toCity = (row: typeof schema.cities.$inferSelect): City => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  province: row.province ?? null,
  centerPoint: row.centerPoint ?? null,
  createdAt: row.createdAt?.toISOString(),
  updatedAt: row.updatedAt?.toISOString(),
});

const toSociety = (row: typeof schema.societies.$inferSelect): Society => ({
  id: row.id,
  cityId: row.cityId,
  city: null,
  name: row.name,
  slug: row.slug,
  kind: row.kind,
  developer: row.developer ?? null,
  regulatoryAuthority: row.regulatoryAuthority ?? null,
  boundary: row.boundary ?? null,
  description: row.description ?? null,
  coverImage: row.coverImage ?? null,
  isActive: row.isActive,
  createdAt: row.createdAt?.toISOString(),
  updatedAt: row.updatedAt?.toISOString(),
});

const toSector = (row: typeof schema.societySectors.$inferSelect): SocietySector => ({
  id: row.id,
  societyId: row.societyId,
  name: row.name,
  createdAt: row.createdAt?.toISOString(),
});

const toUnit = (row: typeof schema.units.$inferSelect): Unit => ({
  id: row.id,
  sectorId: row.sectorId,
  unitNumber: row.unitNumber,
  streetNumber: row.streetNumber ?? null,
  lat: 0,
  lng: 0,
  areaValue: row.areaValue ?? null,
  areaUnit: row.areaUnit ?? null,
  type: row.type ?? null,
  createdAt: row.createdAt?.toISOString(),
  updatedAt: row.updatedAt?.toISOString(),
});

// ── Cities ─────────────────────────────────────────────────────────────

export async function createCityAction(
  values: CityFormValues,
): Promise<ActionResult<City>> {
  await requireRole("admin");
  const parsed = citySchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db
      .insert(schema.cities)
      .values({ name: parsed.data.name, slug: slugify(parsed.data.name), province: parsed.data.province as never })
      .returning();
    revalidate();
    return { ok: true, data: toCity(row) };
  } catch (error) {
    return catchResult(error, "Failed to create the city.");
  }
}

export async function updateCityAction(
  id: string,
  values: CityFormValues,
): Promise<ActionResult<City>> {
  await requireRole("admin");
  const parsed = citySchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db
      .update(schema.cities)
      .set({
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        province: parsed.data.province as never,
        updatedAt: new Date(),
      })
      .where(eq(schema.cities.id, id))
      .returning();
    if (!row) return errorResult("City not found.");
    revalidate();
    return { ok: true, data: toCity(row) };
  } catch (error) {
    return catchResult(error, "Failed to update the city.");
  }
}

export async function deleteCityAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("admin");
  try {
    await db.delete(schema.cities).where(eq(schema.cities.id, id));
    revalidate();
    return { ok: true, data: { id } };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return errorResult("Delete its societies first.");
    }
    return catchResult(error, "Failed to delete the city.");
  }
}

// ── Societies ──────────────────────────────────────────────────────────

export async function createSocietyAction(
  values: SocietyFormValues,
): Promise<ActionResult<Society>> {
  const user = await requireRole("admin");
  const parsed = societySchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db.transaction(async (tx) => {
      const [society] = await tx
        .insert(schema.societies)
        .values({
          cityId: parsed.data.cityId,
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          kind: parsed.data.kind,
          developer: parsed.data.developer,
          regulatoryAuthority: parsed.data.regulatoryAuthority,
          boundary: parsed.data.boundary || null,
          coverImage: parsed.data.coverImage,
          isActive: parsed.data.isActive,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "societies",
        entityId: society.id,
        doneBy: user.id,
        details: JSON.stringify({ name: society.name }),
      });
      return [society];
    });
    revalidate();
    return { ok: true, data: toSociety(row) };
  } catch (error) {
    return catchResult(error, "Failed to create the society.");
  }
}

export async function updateSocietyAction(
  id: string,
  values: SocietyFormValues,
): Promise<ActionResult<Society>> {
  const user = await requireRole("admin");
  const parsed = societySchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db.transaction(async (tx) => {
      const [society] = await tx
        .update(schema.societies)
        .set({
          cityId: parsed.data.cityId,
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          kind: parsed.data.kind,
          developer: parsed.data.developer,
          regulatoryAuthority: parsed.data.regulatoryAuthority,
          boundary: parsed.data.boundary || null,
          coverImage: parsed.data.coverImage,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(schema.societies.id, id))
        .returning();
      if (society) {
        await logActivity(tx, {
          action: "update",
          entityType: "societies",
          entityId: society.id,
          doneBy: user.id,
          details: JSON.stringify({ name: society.name }),
        });
      }
      return [society];
    });
    if (!row) return errorResult("Society not found.");
    revalidate();
    return { ok: true, data: toSociety(row) };
  } catch (error) {
    return catchResult(error, "Failed to update the society.");
  }
}

export async function deleteSocietyAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("admin");
  try {
    await db.transaction(async (tx) => {
      await tx.delete(schema.societies).where(eq(schema.societies.id, id));
      await logActivity(tx, {
        action: "delete",
        entityType: "societies",
        entityId: id,
        doneBy: user.id,
        details: JSON.stringify({ id }),
      });
    });
    revalidate();
    return { ok: true, data: { id } };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return errorResult("Delete its sectors first.");
    }
    return catchResult(error, "Failed to delete the society.");
  }
}

// ── Sectors ────────────────────────────────────────────────────────────

export async function createSectorAction(
  values: SectorFormValues,
): Promise<ActionResult<SocietySector>> {
  await requireRole("admin");
  const parsed = sectorSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db
      .insert(schema.societySectors)
      .values({ societyId: parsed.data.societyId, name: parsed.data.name })
      .returning();
    revalidate();
    return { ok: true, data: toSector(row) };
  } catch (error) {
    return catchResult(error, "Failed to create the sector.");
  }
}

export async function updateSectorAction(
  id: string,
  values: SectorFormValues,
): Promise<ActionResult<SocietySector>> {
  await requireRole("admin");
  const parsed = sectorSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db
      .update(schema.societySectors)
      .set({ name: parsed.data.name })
      .where(eq(schema.societySectors.id, id))
      .returning();
    if (!row) return errorResult("Sector not found.");
    revalidate();
    return { ok: true, data: toSector(row) };
  } catch (error) {
    return catchResult(error, "Failed to update the sector.");
  }
}

export async function deleteSectorAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireRole("admin");
  try {
    await db.delete(schema.societySectors).where(eq(schema.societySectors.id, id));
    revalidate();
    return { ok: true, data: { id } };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return errorResult("Delete its units first.");
    }
    return catchResult(error, "Failed to delete the sector.");
  }
}

// ── Units ──────────────────────────────────────────────────────────────

function centroidFromLatLng(lat: string, lng: string): string {
  return `POINT(${Number(lng).toFixed(6)} ${Number(lat).toFixed(6)})`;
}

export async function createUnitAction(
  values: UnitFormValues,
): Promise<ActionResult<Unit>> {
  const user = await requireRole("admin");
  const parsed = unitSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db.transaction(async (tx) => {
      const [unit] = await tx
        .insert(schema.units)
        .values({
          sectorId: parsed.data.sectorId,
          unitNumber: parsed.data.unitNumber,
          streetNumber: parsed.data.streetNumber,
          centroid: centroidFromLatLng(parsed.data.lat, parsed.data.lng),
          areaValue: parsed.data.areaValue != null ? String(parsed.data.areaValue) : null,
          areaUnit: parsed.data.areaUnit ?? null,
          type: parsed.data.type ?? null,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "units",
        entityId: unit.id,
        doneBy: user.id,
        details: JSON.stringify({ unitNumber: unit.unitNumber }),
      });
      return [unit];
    });
    revalidate();
    return { ok: true, data: toUnit(row) };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return errorResult("A unit with this number already exists in the sector.");
    }
    return catchResult(error, "Failed to create the unit.");
  }
}

export async function updateUnitAction(
  id: string,
  values: UnitFormValues,
): Promise<ActionResult<Unit>> {
  const user = await requireRole("admin");
  const parsed = unitSchema.safeParse(values);
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const [row] = await db.transaction(async (tx) => {
      const [unit] = await tx
        .update(schema.units)
        .set({
          sectorId: parsed.data.sectorId,
          unitNumber: parsed.data.unitNumber,
          streetNumber: parsed.data.streetNumber,
          centroid: centroidFromLatLng(parsed.data.lat, parsed.data.lng),
          areaValue: parsed.data.areaValue != null ? String(parsed.data.areaValue) : null,
          areaUnit: parsed.data.areaUnit ?? null,
          type: parsed.data.type ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.units.id, id))
        .returning();
      if (unit) {
        await logActivity(tx, {
          action: "update",
          entityType: "units",
          entityId: unit.id,
          doneBy: user.id,
          details: JSON.stringify({ unitNumber: unit.unitNumber }),
        });
      }
      return [unit];
    });
    if (!row) return errorResult("Unit not found.");
    revalidate();
    return { ok: true, data: toUnit(row) };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return errorResult("A unit with this number already exists in the sector.");
    }
    return catchResult(error, "Failed to update the unit.");
  }
}

export async function deleteUnitAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("admin");
  try {
    await db.transaction(async (tx) => {
      await tx.delete(schema.units).where(eq(schema.units.id, id));
      await logActivity(tx, {
        action: "delete",
        entityType: "units",
        entityId: id,
        doneBy: user.id,
        details: JSON.stringify({ id }),
      });
    });
    revalidate();
    return { ok: true, data: { id } };
  } catch (error) {
    return catchResult(error, "Failed to delete the unit.");
  }
}