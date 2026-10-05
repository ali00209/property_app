import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type {
  MapArea,
  MapCity,
  MapPayload,
  MapUnit,
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
      city: schema.cities.name,
      area: schema.addresses.area,
      societyId: schema.properties.societyId,
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
    .leftJoin(schema.cities, eq(schema.cities.id, schema.addresses.cityId))
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
      societyId: row.societyId,
      lat,
      lng,
    });
  }

  const cityAgg = new Map<string, MapCity>();
  const propCountBySociety = new Map<string, number>();
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

    if (p.societyId) {
      propCountBySociety.set(
        p.societyId,
        (propCountBySociety.get(p.societyId) ?? 0) + 1,
      );
    }
  }

  const societyRows = await db
    .select({
      id: schema.societies.id,
      name: schema.societies.name,
      city: schema.cities.name,
      boundary: sql<string>`ST_AsText(${schema.societies.boundary}::geometry)`,
      coverImage: schema.societies.coverImage,
      lat: sql<number>`ST_Y(ST_Centroid(${schema.societies.boundary}::geometry)::geometry)`,
      lng: sql<number>`ST_X(ST_Centroid(${schema.societies.boundary}::geometry)::geometry)`,
    })
    .from(schema.societies)
    .innerJoin(schema.cities, eq(schema.cities.id, schema.societies.cityId));

  const areas: MapArea[] = [];
  for (const r of societyRows) {
    if (!r.boundary || r.lat === null || r.lng === null) continue;
    areas.push({
      id: r.id,
      city: r.city,
      area: r.name,
      lat: r.lat,
      lng: r.lng,
      count: propCountBySociety.get(r.id) ?? 0,
      boundary: r.boundary,
      coverImage: r.coverImage,
    });
  }

  const unitRows = await db
    .select({
      id: schema.units.id,
      unitNumber: schema.units.unitNumber,
      societyId: schema.societySectors.societyId,
      lat: sql<number>`ST_Y(${schema.units.centroid}::geometry)`,
      lng: sql<number>`ST_X(${schema.units.centroid}::geometry)`,
    })
    .from(schema.units)
    .innerJoin(
      schema.societySectors,
      eq(schema.societySectors.id, schema.units.sectorId),
    );

  const units: MapUnit[] = [];
  for (const r of unitRows) {
    if (r.lat === null || r.lng === null) continue;
    units.push({
      id: r.id,
      societyId: r.societyId,
      unitNumber: r.unitNumber,
      lat: r.lat,
      lng: r.lng,
    });
  }

  return {
    cities: [...cityAgg.values()],
    areas: areas.sort((a, b) => a.area.localeCompare(b.area)),
    properties,
    units,
  };
}