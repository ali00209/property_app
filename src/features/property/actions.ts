"use server";

import { randomUUID } from "node:crypto";

import { db, schema } from "@/db";
import type { DbOrTransaction } from "@/lib/activity";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { saveUpload, type SavedUpload } from "@/lib/upload";
import { moneyString } from "@/lib/utils";
import type { ActionResult, AreaUnit, PropertyDetail } from "@/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getPropertyRow } from "./db-queries";
import {
  featureRowSchema,
  ownerListSchema,
  propertySchema,
} from "./validations";

const ACTIVE_DEAL_STATUSES = ["pending_acceptance", "active"] as const;

const TEXT_FIELDS = [
  "title",
  "description",
  "listingPurpose",
  "price",
  "monthlyRent",
  "bedrooms",
  "bathrooms",
  "yearBuilt",
  "parcelNumber",
  "isBalloted",
  "fbrValuation",
  "dcRate",
  "cityId",
  "unitId",
] as const;

const AREA_TO_SQFT: Record<AreaUnit, number> = {
  marla: 272.25,
  kanal: 5445,
  acre: 43560,
  sqft: 1,
  sqyd: 9,
  sqm: 10.763910417,
};

const DEFAULT_AREA_UNIT: AreaUnit = "kanal";

function parseFormData(formData: FormData): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    result[key] = typeof value === "string" ? value : undefined;
  }
  return result;
}

function parseJsonRows<T>(raw: string | undefined | null): T[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function errorResult(e: unknown): ActionResult<never> {
  const message =
    e instanceof Error && e.message
      ? e.message
      : "Something went wrong while saving the property.";
  return { ok: false, error: { message } };
}

function areaSqftString(areaValue: number, areaUnit: AreaUnit): string {
  const coverage = areaValue * AREA_TO_SQFT[areaUnit];
  return Math.round(coverage * 100) / 100 + "";
}

type UnitContext = {
  unit: typeof schema.units.$inferSelect;
  lat: number | null;
  lng: number | null;
  sectorSocietyId: string;
  societyName: string;
  cityId: string;
  cityName: string;
  cityProvince: string | null;
};

async function loadUnitContext(
  tx: DbOrTransaction,
  unitId: string,
): Promise<UnitContext> {
  const [row] = await tx
    .select({
      unit: schema.units,
      lat: sql<number>`ST_Y(${schema.units.centroid}::geometry)`,
      lng: sql<number>`ST_X(${schema.units.centroid}::geometry)`,
      sectorSocietyId: schema.societySectors.societyId,
      societyName: schema.societies.name,
      cityId: schema.societies.cityId,
      cityName: schema.cities.name,
      cityProvince: schema.cities.province,
    })
    .from(schema.units)
    .innerJoin(
      schema.societySectors,
      eq(schema.societySectors.id, schema.units.sectorId),
    )
    .innerJoin(
      schema.societies,
      eq(schema.societies.id, schema.societySectors.societyId),
    )
    .innerJoin(schema.cities, eq(schema.cities.id, schema.societies.cityId))
    .where(eq(schema.units.id, unitId));
  if (!row) throw new Error("Unit not found.");
  return row;
}

function derivedArea(unit: typeof schema.units.$inferSelect) {
  const areaUnit = (unit.areaUnit ?? DEFAULT_AREA_UNIT) as AreaUnit;
  const hasArea =
    unit.areaValue != null && Number(unit.areaValue) > 0;
  return {
    areaValue: hasArea ? String(unit.areaValue) : "0",
    areaUnit,
    areaSqft: hasArea
      ? areaSqftString(Number(unit.areaValue), areaUnit)
      : null,
  };
}

function locationPointFrom(ctx: UnitContext): string | null {
  if (ctx.lat == null || ctx.lng == null) return null;
  return `POINT(${Number(ctx.lng).toFixed(6)} ${Number(ctx.lat).toFixed(6)})`;
}

async function applyAddress(
  tx: DbOrTransaction,
  propertyId: string,
  ctx: UnitContext,
): Promise<void> {
  const latitude = ctx.lat != null ? ctx.lat.toFixed(6) : null;
  const longitude = ctx.lng != null ? ctx.lng.toFixed(6) : null;
  const formattedAddress =
    [
      ctx.unit.streetNumber,
      ctx.societyName,
      ctx.cityName,
      ctx.cityProvince,
      "Pakistan",
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ") || null;

  const values = {
    entityId: propertyId,
    street: ctx.unit.streetNumber ?? "",
    area: ctx.societyName,
    cityId: ctx.cityId,
    state: (ctx.cityProvince ?? "federal") as never,
    zipCode: "",
    country: "pakistan",
    latitude,
    longitude,
    formattedAddress,
  };

  const [existing] = await tx
    .select({ id: schema.addresses.id })
    .from(schema.addresses)
    .where(eq(schema.addresses.entityId, propertyId));

  if (existing) {
    await tx
      .update(schema.addresses)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.addresses.id, existing.id));
    return;
  }

  await tx
    .insert(schema.addresses)
    .values({ entityType: "property", ...values });
}

async function resolveOwnerId(
  tx: DbOrTransaction,
  row: { mode: "existing" | "new"; ownerId?: string; name?: string; email?: string; phone?: string },
): Promise<string> {
  if (row.mode === "existing") {
    const [owner] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
      .where(
        and(eq(schema.users.id, row.ownerId!), eq(schema.roles.role, "owner")),
      );
    if (!owner) throw new Error("Owner not found.");
    return owner.id;
  }

  if (row.email) {
    const [existing] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, row.email));
    if (existing) return existing.id;
  }
  if (row.phone) {
    const [existing] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.phone, row.phone));
    if (existing) return existing.id;
  }

  const [ownerRole] = await tx
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.role, "owner"));
  if (!ownerRole) throw new Error("Owner role not configured.");

  const password = await hashPassword(randomUUID());
  const [user] = await tx
    .insert(schema.users)
    .values({
      name: row.name!,
      email: row.email || null,
      phone: row.phone || null,
      password,
      roleId: ownerRole.id,
      filerStatus: "non_filer",
    })
    .returning({ id: schema.users.id });
  return user.id;
}

async function applyOwners(
  tx: DbOrTransaction,
  propertyId: string,
  rows: { mode: "existing" | "new"; ownerId?: string; name?: string; email?: string; phone?: string; ownershipPercentage: number }[],
): Promise<void> {
  await tx
    .delete(schema.propertyOwner)
    .where(eq(schema.propertyOwner.propertyId, propertyId));

  if (rows.length === 0) return;

  const resolved = new Map<string, string>();
  const emailSeen = new Map<string, string>();
  const phoneSeen = new Map<string, string>();

  for (const row of rows) {
    let ownerId: string | undefined;
    if (row.mode === "existing") {
      ownerId = row.ownerId;
    } else {
      if (row.email && emailSeen.has(row.email)) {
        ownerId = emailSeen.get(row.email)!;
      } else if (row.phone && phoneSeen.has(row.phone)) {
        ownerId = phoneSeen.get(row.phone)!;
      } else {
        ownerId = await resolveOwnerId(tx, row);
      }
    }
    if (!ownerId) throw new Error("Owner record is missing.");
    if (row.email) emailSeen.set(row.email, ownerId);
    if (row.phone) phoneSeen.set(row.phone, ownerId);
    if (resolved.has(ownerId)) continue;
    resolved.set(ownerId, ownerId);
    await tx.insert(schema.propertyOwner).values({
      propertyId,
      ownerId,
      ownershipPercentage: row.ownershipPercentage,
    });
  }
}

async function applyFeatures(
  tx: DbOrTransaction,
  propertyId: string,
  rows: { feature: string; value: string }[],
): Promise<void> {
  await tx
    .delete(schema.propertyFeatures)
    .where(eq(schema.propertyFeatures.propertyId, propertyId));
  if (rows.length === 0) return;
  await tx.insert(schema.propertyFeatures).values(
    rows.map((row) => ({
      propertyId,
      feature: row.feature,
      value: row.value || "true",
    })),
  );
}

async function applyImages(
  tx: DbOrTransaction,
  propertyId: string,
  uploads: SavedUpload[],
): Promise<void> {
  if (uploads.length === 0) return;
  const existing = await tx
    .select({ isPrimary: schema.propertyImages.isPrimary, sortOrder: schema.propertyImages.sortOrder })
    .from(schema.propertyImages)
    .where(eq(schema.propertyImages.propertyId, propertyId));
  const hasPrimary = existing.some((image) => image.isPrimary);
  const start =
    existing.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
  await tx.insert(schema.propertyImages).values(
    uploads.map((file, index) => ({
      propertyId,
      url: file.url,
      isPrimary: !hasPrimary && index === 0,
      sortOrder: start + index,
    })),
  );
}

async function applyDocuments(
  tx: DbOrTransaction,
  propertyId: string,
  uploads: SavedUpload[],
): Promise<void> {
  if (uploads.length === 0) return;
  await tx.insert(schema.documents).values(
    uploads.map((file) => ({
      entityId: propertyId,
      entityType: "properties" as const,
      fileType: file.fileType,
      name: file.name,
      fileSize: file.fileSize,
      fileUrl: file.url,
    })),
  );
}

type OwnerInput = {
  mode: "existing" | "new";
  ownerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  ownershipPercentage: number;
};

function dedupeFeatures(
  rows: { feature: string; value: string }[],
): { feature: string; value: string }[] {
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.feature, row.value);
  return [...map.entries()].map(([feature, value]) => ({ feature, value }));
}

async function currentOwnerState(
  tx: DbOrTransaction,
  propertyId: string,
): Promise<Map<string, number>> {
  const rows = await tx
    .select({
      ownerId: schema.propertyOwner.ownerId,
      ownershipPercentage: schema.propertyOwner.ownershipPercentage,
    })
    .from(schema.propertyOwner)
    .where(eq(schema.propertyOwner.propertyId, propertyId));
  return new Map(
    rows
      .filter((row) => row.ownerId)
      .map((row) => [row.ownerId!, row.ownershipPercentage ?? 0]),
  );
}

async function currentFeatureState(
  tx: DbOrTransaction,
  propertyId: string,
): Promise<Map<string, string>> {
  const rows = await tx
    .select({ feature: schema.propertyFeatures.feature, value: schema.propertyFeatures.value })
    .from(schema.propertyFeatures)
    .where(eq(schema.propertyFeatures.propertyId, propertyId));
  return new Map(rows.map((row) => [row.feature, row.value]));
}

function ownersChanged(
  incoming: OwnerInput[],
  current: Map<string, number>,
): boolean {
  if (incoming.length !== current.size) return true;
  for (const row of incoming) {
    if (row.ownershipPercentage !== current.get(row.ownerId ?? "")) return true;
  }
  return false;
}

function featuresChanged(
  incoming: { feature: string; value: string }[],
  current: Map<string, string>,
): boolean {
  const deduped = dedupeFeatures(incoming);
  if (deduped.length !== current.size) return true;
  for (const row of deduped) {
    if (current.get(row.feature) !== (row.value || "true")) return true;
  }
  return false;
}

export async function createPropertyAction(
  formData: FormData,
): Promise<ActionResult<PropertyDetail>> {
  const admin = await requireRole("admin");

  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);
  const documents = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File);

  const parsed = propertySchema.safeParse({
    ...parseFormData(formData),
    images,
    documents,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Please fix the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const featuresParsed = featureRowSchema
    .array()
    .safeParse(parseJsonRows<{ feature: string; value: string }>(formData.get("features") as string | undefined));
  const ownersParsed = ownerListSchema.safeParse(
    parseJsonRows<OwnerInput>(formData.get("owners") as string | undefined),
  );
  if (!featuresParsed.success || !ownersParsed.success) {
    return {
      ok: false,
      error: { message: "Please check the features and owners." },
    };
  }

  const values = parsed.data;
  const features = dedupeFeatures(featuresParsed.data);
  const owners = ownersParsed.data;

  try {
    const imageUploads = await Promise.all(images.map((file) => saveUpload(file)));
    const documentUploads = await Promise.all(
      documents.map((file) => saveUpload(file)),
    );

    const result = await db.transaction(async (tx) => {
      const unitCtx = await loadUnitContext(tx, values.unitId);
      const area = derivedArea(unitCtx.unit);

      const [property] = await tx
        .insert(schema.properties)
        .values({
          title: values.title,
          slug: slugify(values.title),
          description: values.description || null,
          type: (unitCtx.unit.type ?? "residential") as never,
          listingPurpose: values.listingPurpose,
          cityId: unitCtx.cityId,
          societyId: unitCtx.sectorSocietyId,
          sectorId: unitCtx.unit.sectorId,
          unitId: values.unitId,
          locationPoint: locationPointFrom(unitCtx),
          price: moneyString(values.price),
          monthlyRent:
            values.monthlyRent === undefined
              ? null
              : moneyString(values.monthlyRent),
          areaValue: area.areaValue,
          areaUnit: area.areaUnit,
          areaSqft: area.areaSqft,
          bedrooms: values.bedrooms ?? null,
          bathrooms: values.bathrooms ?? null,
          yearBuilt: values.yearBuilt ?? null,
          parcelNumber: values.parcelNumber || null,
          isBalloted: values.isBalloted ?? false,
          fbrValuation: values.fbrValuation != null ? moneyString(values.fbrValuation) : null,
          dcRate: values.dcRate != null ? moneyString(values.dcRate) : null,
        })
        .returning();

      await applyAddress(tx, property.id, unitCtx);
      await applyOwners(tx, property.id, owners);
      await applyFeatures(tx, property.id, features);
      await applyImages(tx, property.id, imageUploads);
      await applyDocuments(tx, property.id, documentUploads);
      await logActivity(tx, {
        action: "create",
        entityType: "properties",
        entityId: property.id,
        doneBy: admin.id,
        details: JSON.stringify({ title: property.title }),
      });

      return getPropertyRow(tx, property.id);
    });

    revalidatePath("/dashboard/properties");
    return { ok: true, data: result };
  } catch (e) {
    return errorResult(e);
  }
}

export async function updatePropertyAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<PropertyDetail>> {
  const admin = await requireRole("admin");

  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);
  const documents = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File);

  const parsed = propertySchema.safeParse({
    ...parseFormData(formData),
    images,
    documents,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Please fix the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const featuresParsed = featureRowSchema
    .array()
    .safeParse(parseJsonRows<{ feature: string; value: string }>(formData.get("features") as string | undefined));
  const ownersParsed = ownerListSchema.safeParse(
    parseJsonRows<OwnerInput>(formData.get("owners") as string | undefined),
  );
  if (!featuresParsed.success || !ownersParsed.success) {
    return {
      ok: false,
      error: { message: "Please check the features and owners." },
    };
  }

  const values = parsed.data;
  const features = dedupeFeatures(featuresParsed.data);
  const owners = ownersParsed.data;

  try {
    const [existing] = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));
    if (!existing) throw new Error("Property not found.");

    const activeDeal = await db
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.propertyId, id),
          inArray(schema.deals.status, [...ACTIVE_DEAL_STATUSES]),
        ),
      );

    const currentOwnerMap = await currentOwnerState(db, id);
    const currentFeatureMap = await currentFeatureState(db, id);

    const moneyDiffers = (
      incoming: number | undefined,
      current: string | null,
    ): boolean => moneyString(incoming ?? 0) !== String(current ?? 0);
    const textDiffers = (
      incoming: string | number | undefined,
      current: string | number | null,
    ): boolean => String(incoming ?? "") !== String(current ?? "");

    const changed =
      textDiffers(values.title, existing.title) ||
      values.listingPurpose !== existing.listingPurpose ||
      moneyDiffers(values.price, existing.price) ||
      moneyDiffers(values.monthlyRent, existing.monthlyRent) ||
      textDiffers(values.bedrooms, existing.bedrooms) ||
      textDiffers(values.bathrooms, existing.bathrooms) ||
      textDiffers(values.yearBuilt, existing.yearBuilt) ||
      textDiffers(values.parcelNumber, existing.parcelNumber) ||
      moneyDiffers(values.fbrValuation, existing.fbrValuation) ||
      moneyDiffers(values.dcRate, existing.dcRate) ||
      textDiffers(values.cityId, existing.cityId) ||
      textDiffers(values.unitId, existing.unitId) ||
      ownersChanged(owners, currentOwnerMap) ||
      featuresChanged(features, currentFeatureMap);

    if (activeDeal.length > 0 && changed) {
      throw new Error(
        "Property listing fields are locked while an active deal exists.",
      );
    }

    const imageUploads = images.length
      ? await Promise.all(images.map((file) => saveUpload(file)))
      : [];
    const documentUploads = documents.length
      ? await Promise.all(documents.map((file) => saveUpload(file)))
      : [];

    const result = await db.transaction(async (tx) => {
      const unitCtx = await loadUnitContext(tx, values.unitId);
      const area = derivedArea(unitCtx.unit);

      if (changed) {
        await tx
          .update(schema.properties)
          .set({
            title: values.title,
            slug: slugify(values.title),
            description: values.description || null,
            type: (unitCtx.unit.type ?? "residential") as never,
            listingPurpose: values.listingPurpose,
            cityId: unitCtx.cityId,
            societyId: unitCtx.sectorSocietyId,
            sectorId: unitCtx.unit.sectorId,
            unitId: values.unitId,
            locationPoint: locationPointFrom(unitCtx),
            price: moneyString(values.price),
            monthlyRent:
              values.monthlyRent === undefined
                ? null
                : moneyString(values.monthlyRent),
            areaValue: area.areaValue,
            areaUnit: area.areaUnit,
            areaSqft: area.areaSqft,
            bedrooms: values.bedrooms ?? null,
            bathrooms: values.bathrooms ?? null,
            yearBuilt: values.yearBuilt ?? null,
            parcelNumber: values.parcelNumber || null,
            isBalloted: values.isBalloted ?? false,
            fbrValuation: values.fbrValuation != null ? moneyString(values.fbrValuation) : null,
            dcRate: values.dcRate != null ? moneyString(values.dcRate) : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.properties.id, id));
      }

      await applyAddress(tx, id, unitCtx);
      await applyOwners(tx, id, owners);
      await applyFeatures(tx, id, features);
      await applyImages(tx, id, imageUploads);
      await applyDocuments(tx, id, documentUploads);
      await logActivity(tx, {
        action: "update",
        entityType: "properties",
        entityId: id,
        doneBy: admin.id,
      });

      return getPropertyRow(tx, id);
    });

    revalidatePath("/dashboard/properties");
    revalidatePath(`/dashboard/properties/${id}`);
    return { ok: true, data: result };
  } catch (e) {
    return errorResult(e);
  }
}

export async function archivePropertyAction(
  id: string,
): Promise<ActionResult<PropertyDetail["status"]>> {
  return changeStatusAction(id, "archived", "hide");
}

export async function restorePropertyAction(
  id: string,
): Promise<ActionResult<PropertyDetail["status"]>> {
  return changeStatusAction(id, "available", "show");
}

async function changeStatusAction(
  id: string,
  status: "available" | "archived",
  action: "hide" | "show",
): Promise<ActionResult<PropertyDetail["status"]>> {
  const admin = await requireRole("admin");

  try {
    const [property] = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));
    if (!property) throw new Error("Property not found.");

    if (status === "archived") {
      const [activeDeal] = await db
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(
          and(
            eq(schema.deals.propertyId, id),
            inArray(schema.deals.status, [...ACTIVE_DEAL_STATUSES]),
          ),
        );
      if (activeDeal) {
        throw new Error("Properties with active deals cannot be archived.");
      }
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.properties)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.properties.id, id))
        .returning({ status: schema.properties.status });
      await logActivity(tx, {
        action,
        entityType: "properties",
        entityId: id,
        doneBy: admin.id,
        details: JSON.stringify({ status }),
      });
      return row;
    });

    revalidatePath("/dashboard/properties");
    revalidatePath(`/dashboard/properties/${id}`);
    return { ok: true, data: updated.status };
  } catch (e) {
    return errorResult(e);
  }
}

export async function hasActiveDeal(propertyId: string): Promise<boolean> {
  const [deal] = await db
    .select({ id: schema.deals.id })
    .from(schema.deals)
    .where(
      and(
        eq(schema.deals.propertyId, propertyId),
        inArray(schema.deals.status, [...ACTIVE_DEAL_STATUSES]),
      ),
    );
  return Boolean(deal);
}