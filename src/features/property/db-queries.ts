import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import type { DbOrTransaction } from "@/lib/activity";
import type {
  PropertyDetail,
  SessionUser,
  User,
} from "@/types";

export async function getPropertyRow(
  database: DbOrTransaction,
  id: string,
): Promise<PropertyDetail> {
  const [property] = await database
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.id, id));
  if (!property) notFound();

  const [address] = await database
    .select()
    .from(schema.addresses)
    .where(
      and(
        eq(schema.addresses.entityId, id),
        eq(schema.addresses.entityType, "property"),
      ),
    );

  let cityName: string | null = null;
  if (address?.cityId) {
    const [cityRow] = await database
      .select({ name: schema.cities.name })
      .from(schema.cities)
      .where(eq(schema.cities.id, address.cityId));
    cityName = cityRow?.name ?? null;
  }

  const features = await database
    .select()
    .from(schema.propertyFeatures)
    .where(eq(schema.propertyFeatures.propertyId, id));

  const ownerRows = await database
    .select({
      owner: schema.propertyOwner,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.roles.role,
      roleId: schema.users.roleId,
    })
    .from(schema.propertyOwner)
    .leftJoin(schema.users, eq(schema.users.id, schema.propertyOwner.ownerId))
    .leftJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.propertyOwner.propertyId, id))
    .orderBy(asc(schema.propertyOwner.ownershipPercentage));

  const images = await database
    .select()
    .from(schema.propertyImages)
    .where(eq(schema.propertyImages.propertyId, id));

  const documents = await database
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.entityId, id),
        eq(schema.documents.entityType, "properties"),
      ),
    );

  const iso = (value: Date | null | undefined): string | undefined =>
    value instanceof Date ? value.toISOString() : undefined;

  return {
    ...property,
    createdAt: iso(property.createdAt),
    updatedAt: iso(property.updatedAt),
    address: address
      ? {
          ...address,
          city: cityName,
          createdAt: iso(address.createdAt),
          updatedAt: iso(address.updatedAt),
        }
      : null,
    features: features.map((feature) => ({
      ...feature,
      createdAt: iso(feature.createdAt),
      updatedAt: iso(feature.updatedAt),
    })),
    owners: ownerRows.map(({ owner, name, email, role, roleId }) => ({
      ...owner,
      createdAt: iso(owner.createdAt),
      updatedAt: iso(owner.updatedAt),
      user: name
        ? ({
            id: owner.ownerId,
            name,
            email,
            role,
            roleId,
          } as unknown as User)
        : null,
    })),
    images: images.map((image) => ({
      ...image,
      createdAt: iso(image.createdAt),
    })),
    documents: documents.map((document) => ({
      ...document,
      createdAt: iso(document.createdAt),
    })),
  } satisfies PropertyDetail;
}

function ownerScope(user: SessionUser) {
  return inArray(
    schema.properties.id,
    db
      .select({ id: schema.propertyOwner.propertyId })
      .from(schema.propertyOwner)
      .where(eq(schema.propertyOwner.ownerId, user.id)),
  );
}

export async function listProperties(user: SessionUser): Promise<PropertyDetail[]> {
  const conditions = [];
  if (user.role === "client") {
    conditions.push(eq(schema.properties.status, "available"));
  } else if (user.role === "owner") {
    conditions.push(ownerScope(user));
  }

  const rows = await db
    .select({ id: schema.properties.id })
    .from(schema.properties)
    .where(conditions.length ? and(...conditions) : undefined);

  return Promise.all(rows.map((row) => getPropertyRow(db, row.id)));
}

export async function getOwnerOptions(): Promise<Array<{ id: string; name: string }>> {
  const rows = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.roles.role, "owner"));
  return rows;
}

export async function getScopedPropertyDetail(
  user: SessionUser,
  id: string,
): Promise<PropertyDetail> {
  const conditions = [eq(schema.properties.id, id)];
  if (user.role === "owner") conditions.push(ownerScope(user));

  const [row] = await db
    .select({ id: schema.properties.id })
    .from(schema.properties)
    .where(and(...conditions));

  if (!row) notFound();
  return getPropertyRow(db, row.id);
}