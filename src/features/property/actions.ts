"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import type { DbOrTransaction } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { geocode } from "@/lib/maps";
import { saveUpload, type SavedUpload } from "@/lib/upload";
import { moneyString } from "@/lib/utils";
import type { ActionResult, PropertyDetail } from "@/types";
import { propertySchema, type PropertyFormValues } from "./validations";
import { getPropertyRow } from "./db-queries";

const ACTIVE_DEAL_STATUSES = ["pending_acceptance", "active"] as const;

const PROTECTED_FIELDS = [
  "title",
  "type",
  "price",
  "monthlyRent",
  "area",
  "bedrooms",
  "bathrooms",
  "yearBuilt",
  "parcelNumber",
  "ownerId",
  "country",
  "state",
  "city",
  "street",
  "zipCode",
  "locality",
  "latitude",
  "longitude",
  "formattedAddress",
];

const TEXT_FIELDS = [
  "title",
  "description",
  "type",
  "price",
  "monthlyRent",
  "area",
  "bedrooms",
  "bathrooms",
  "yearBuilt",
  "parcelNumber",
  "ownerId",
  "country",
  "state",
  "city",
  "street",
  "zipCode",
  "locality",
  "latitude",
  "longitude",
  "formattedAddress",
] as const;

type AddressValues = {
  country?: string
  state?: string
  city?: string
  street?: string
  zipCode?: string
  locality?: string
  latitude?: string
  longitude?: string
  formattedAddress?: string
}

function parseFormData(formData: FormData): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    result[key] = typeof value === "string" ? value : undefined;
  }
  return result;
}

async function resolveCoordinates(values: AddressValues): Promise<{
  latitude?: string
  longitude?: string
  formattedAddress?: string
}> {
  if (values.latitude && values.longitude) {
    return {
      latitude: values.latitude,
      longitude: values.longitude,
      formattedAddress: values.formattedAddress,
    };
  }
  return geocode({
    street: values.street,
    city: values.city,
    state: values.state,
    zipCode: values.zipCode,
  });
}

async function persistAddress(
  tx: DbOrTransaction,
  propertyId: string,
  values: AddressValues,
): Promise<void> {
  const coords = await resolveCoordinates(values);
  await tx.insert(schema.addresses).values({
    entityType: "property",
    entityId: propertyId,
    country: values.country,
    street: values.street ?? "",
    area: values.locality ?? null,
    city: values.city ?? "",
    state: (values.state ?? "federal") as never,
    zipCode: values.zipCode ?? "",
    ...coords,
  });
}

async function upsertAddress(
  tx: DbOrTransaction,
  propertyId: string,
  values: AddressValues,
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(schema.addresses)
    .where(
      and(
        eq(schema.addresses.entityId, propertyId),
        eq(schema.addresses.entityType, "property"),
      ),
    );

  if (!existing) {
    await persistAddress(tx, propertyId, values);
    return;
  }

  const hasExplicitCoords = Boolean(values.latitude && values.longitude);
  const coords = hasExplicitCoords
    ? {
        latitude: values.latitude,
        longitude: values.longitude,
        formattedAddress: values.formattedAddress,
      }
    : await resolveCoordinates(values);

  await tx
    .update(schema.addresses)
    .set({
      country: values.country ?? existing.country,
      street: values.street ?? existing.street,
      area: values.locality ?? existing.area,
      city: values.city ?? existing.city,
      state: (values.state ?? existing.state) as never,
      zipCode: values.zipCode ?? existing.zipCode,
      ...coords,
      updatedAt: new Date(),
    })
    .where(eq(schema.addresses.id, existing.id));
}

async function setOwner(
  tx: DbOrTransaction,
  propertyId: string,
  ownerId: string | undefined,
): Promise<void> {
  await tx
    .delete(schema.propertyOwner)
    .where(eq(schema.propertyOwner.propertyId, propertyId));
  if (!ownerId) return;

  const [owner] = await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.users.id, ownerId), eq(schema.roles.role, "owner")));
  if (!owner) throw new Error("Owner not found.");

  await tx.insert(schema.propertyOwner).values({
    propertyId,
    ownerId,
    ownershipPercentage: 100,
  });
}

async function persistFiles(
  tx: DbOrTransaction,
  propertyId: string,
  cover?: SavedUpload | null,
  documents: SavedUpload[] = [],
): Promise<void> {
  if (cover) {
    await tx
      .update(schema.propertyImages)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(schema.propertyImages.propertyId, propertyId));
    await tx.insert(schema.propertyImages).values({
      propertyId,
      url: cover.url,
      isPrimary: true,
    });
  }

  if (documents.length) {
    await tx.insert(schema.documents).values(
      documents.map((file) => ({
        entityId: propertyId,
        entityType: "properties" as const,
        fileType: file.fileType,
        name: file.name,
        fileSize: file.fileSize,
        fileUrl: file.url,
      })),
    );
  }
}

function errorResult(e: unknown): ActionResult<never> {
  const message =
    e instanceof Error && e.message
      ? e.message
      : "Something went wrong while saving the property.";
  return { ok: false, error: { message } };
}

export async function createPropertyAction(
  formData: FormData,
): Promise<ActionResult<PropertyDetail>> {
  const admin = await requireRole("admin");

  const coverImage = formData.get("coverImage");
  const documents = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File);

  const parsed = propertySchema.safeParse({
    ...parseFormData(formData),
    coverImage: coverImage instanceof File ? coverImage : null,
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

  const values = parsed.data;

  try {
    const coverUpload = values.coverImage ? await saveUpload(values.coverImage) : null;
    const documentUploads = await Promise.all(
      (values.documents ?? []).map((file) => saveUpload(file)),
    );

    const result = await db.transaction(async (tx) => {
      const [property] = await tx
        .insert(schema.properties)
        .values({
          title: values.title,
          description: values.description ?? null,
          type: values.type as never,
          price: moneyString(values.price),
          monthlyRent:
            values.monthlyRent === undefined ? null : moneyString(values.monthlyRent),
          area: values.area,
          bedrooms: values.bedrooms ?? null,
          bathrooms: values.bathrooms ?? null,
          yearBuilt: values.yearBuilt ?? null,
          parcelNumber: values.parcelNumber || null,
        })
        .returning();

      await persistAddress(tx, property.id, values);
      await setOwner(tx, property.id, values.ownerId);
      await persistFiles(tx, property.id, coverUpload, documentUploads);
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

  const coverImage = formData.get("coverImage");
  const documents = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File);

  const parsed = propertySchema.safeParse({
    ...parseFormData(formData),
    coverImage: coverImage instanceof File ? coverImage : null,
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

  const values = parsed.data;

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

    const addressChanged = [
      values.country,
      values.state,
      values.city,
      values.street,
      values.zipCode,
      values.latitude,
      values.longitude,
      values.formattedAddress,
    ].some((value) => value !== undefined);

    const changedFields = [
      ...(values.title !== undefined ? ["title"] : []),
      ...(values.description !== undefined ? ["description"] : []),
      ...(values.type !== undefined ? ["type"] : []),
      ...(values.price !== undefined ? ["price"] : []),
      ...(values.monthlyRent !== undefined ? ["monthlyRent"] : []),
      ...(values.area !== undefined ? ["area"] : []),
      ...(values.bedrooms !== undefined ? ["bedrooms"] : []),
      ...(values.bathrooms !== undefined ? ["bathrooms"] : []),
      ...(values.yearBuilt !== undefined ? ["yearBuilt"] : []),
      ...(values.parcelNumber !== undefined ? ["parcelNumber"] : []),
      ...(values.ownerId !== undefined ? ["ownerId"] : []),
      ...(addressChanged ? ["address"] : []),
    ];

    if (
      activeDeal.length > 0 &&
      changedFields.some(
        (field) => PROTECTED_FIELDS.includes(field) || field === "address",
      )
    ) {
      throw new Error(
        "Property listing fields are locked while an active deal exists.",
      );
    }

    const coverUpload = values.coverImage ? await saveUpload(values.coverImage) : null;
    const documentUploads = await Promise.all(
      (values.documents ?? []).map((file) => saveUpload(file)),
    );

    const result = await db.transaction(async (tx) => {
      const updates: Partial<typeof schema.properties.$inferInsert> = {};
      if (values.title !== undefined) updates.title = values.title;
      if (values.description !== undefined)
        updates.description = values.description ?? null;
      if (values.type !== undefined) updates.type = values.type as never;
      if (values.price !== undefined) updates.price = moneyString(values.price);
      if (values.monthlyRent !== undefined)
        updates.monthlyRent =
          values.monthlyRent === undefined ? null : moneyString(values.monthlyRent);
      if (values.area !== undefined) updates.area = values.area;
      if (values.bedrooms !== undefined) updates.bedrooms = values.bedrooms ?? null;
      if (values.bathrooms !== undefined)
        updates.bathrooms = values.bathrooms ?? null;
      if (values.yearBuilt !== undefined) updates.yearBuilt = values.yearBuilt ?? null;
      if (values.parcelNumber !== undefined)
        updates.parcelNumber = values.parcelNumber || null;

      if (Object.keys(updates).length > 0) {
        await tx
          .update(schema.properties)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(schema.properties.id, id));
      }
      if (addressChanged) await upsertAddress(tx, id, values);
      if (values.ownerId !== undefined) await setOwner(tx, id, values.ownerId);
      if (coverUpload || documentUploads.length)
        await persistFiles(tx, id, coverUpload, documentUploads);
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