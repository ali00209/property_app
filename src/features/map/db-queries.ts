import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type {
  MapArea,
  MapCity,
  MapPayload,
  MapProperty,
  SessionUser,
} from "@/types";

const num = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function ownerScope(user: SessionUser) {
  return inArray(
    schema.properties.id,
    db
      .select({ id: schema.propertyOwner.propertyId })
      .from(schema.propertyOwner)
      .where(eq(schema.propertyOwner.ownerId, user.id)),
  );
}

export async function getMapPayload(user: SessionUser): Promise<MapPayload> {
  const conditions = [eq(schema.addresses.entityType, "property")];
  if (user.role === "client") {
    conditions.push(eq(schema.properties.status, "available"));
  } else if (user.role === "owner") {
    conditions.push(ownerScope(user));
  }

  const rows = await db
    .select({
      id: schema.properties.id,
      title: schema.properties.title,
      status: schema.properties.status,
      type: schema.properties.type,
      price: schema.properties.price,
      monthlyRent: schema.properties.monthlyRent,
      city: schema.addresses.city,
      area: schema.addresses.area,
      latitude: schema.addresses.latitude,
      longitude: schema.addresses.longitude,
    })
    .from(schema.properties)
    .innerJoin(
      schema.addresses,
      and(
        eq(schema.addresses.entityId, schema.properties.id),
        eq(schema.addresses.entityType, "property"),
      ),
    )
    .where(and(...conditions));

  const properties: MapProperty[] = [];
  for (const row of rows) {
    const lat = num(row.latitude);
    const lng = num(row.longitude);
    if (lat === null || lng === null || !row.city) continue;
    properties.push({
      id: row.id,
      title: row.title,
      status: row.status,
      type: row.type,
      price: row.price,
      monthlyRent: row.monthlyRent,
      city: row.city,
      area: row.area,
      lat,
      lng,
    });
  }

  const cityAgg = new Map<string, MapCity>();
  const areaAgg = new Map<string, MapArea>();
  for (const p of properties) {
    const cityKey = p.city;
    const existing = cityAgg.get(cityKey);
    if (existing) {
      existing.lat = (existing.lat * existing.count + p.lat) / (existing.count + 1);
      existing.lng = (existing.lng * existing.count + p.lng) / (existing.count + 1);
      existing.count += 1;
    } else {
      cityAgg.set(cityKey, {
        city: cityKey,
        lat: p.lat,
        lng: p.lng,
        count: 1,
      });
    }

    const areaKey = `${cityKey}::${p.area ?? ""}`;
    if (p.area) {
      const areaExisting = areaAgg.get(areaKey);
      if (areaExisting) {
        areaExisting.lat =
          (areaExisting.lat * areaExisting.count + p.lat) / (areaExisting.count + 1);
        areaExisting.lng =
          (areaExisting.lng * areaExisting.count + p.lng) / (areaExisting.count + 1);
        areaExisting.count += 1;
      } else {
        areaAgg.set(areaKey, {
          city: cityKey,
          area: p.area,
          lat: p.lat,
          lng: p.lng,
          count: 1,
        });
      }
    }
  }

  return {
    cities: [...cityAgg.values()],
    areas: [...areaAgg.values()],
    properties,
  };
}
