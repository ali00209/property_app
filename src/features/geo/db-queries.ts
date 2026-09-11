import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { City, Unit, Society, SocietySector } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const toCity = (row: typeof schema.cities.$inferSelect): City => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  province: row.province ?? null,
  centerPoint: row.centerPoint ?? null,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

const toSociety = (row: typeof schema.societies.$inferSelect): Society => ({
  id: row.id,
  cityId: row.cityId,
  city: null,
  name: row.name,
  slug: row.slug,
  kind: row.kind,
  developer: row.developer ?? null,
  boundary: row.boundary ?? null,
  description: row.description ?? null,
  coverImage: row.coverImage ?? null,
  isActive: row.isActive,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

const toSector = (row: typeof schema.societySectors.$inferSelect): SocietySector => ({
  id: row.id,
  societyId: row.societyId,
  name: row.name,
  createdAt: iso(row.createdAt),
});

export interface GeoCity extends City {
  societyCount: number
}
export interface GeoSociety extends Society {
  sectorCount: number
}
export interface GeoSector extends SocietySector {
  unitCount: number
}
export interface GeoUnit extends Unit {
  societyId: string
  societyName: string | null
  sectorName: string | null
  cityName: string | null
}
export interface GeoTree {
  cities: GeoCity[]
  societies: GeoSociety[]
  sectors: GeoSector[]
  units: GeoUnit[]
}

export async function getGeoTree(): Promise<GeoTree> {
  const [cityRows, societyRows, sectorRows, unitRows] = await Promise.all([
    db
      .select({
        row: schema.cities,
        centerPointWkt: sql<string>`ST_AsText(${schema.cities.centerPoint}::geometry)`,
      })
      .from(schema.cities)
      .orderBy(asc(schema.cities.name)),
    db
      .select({
        row: schema.societies,
        boundaryWkt: sql<string>`ST_AsText(${schema.societies.boundary}::geometry)`,
      })
      .from(schema.societies)
      .orderBy(asc(schema.societies.name)),
    db.select().from(schema.societySectors).orderBy(asc(schema.societySectors.name)),
    db
      .select({
        unit: schema.units,
        lat: sql<number>`ST_Y(${schema.units.centroid}::geometry)`,
        lng: sql<number>`ST_X(${schema.units.centroid}::geometry)`,
        sectorSocietyId: sql<string>`${schema.societySectors.societyId}`,
      })
      .from(schema.units)
      .leftJoin(
        schema.societySectors,
        eq(schema.societySectors.id, schema.units.sectorId),
      )
      .orderBy(asc(schema.units.unitNumber)),
  ]);

  const societyNames = new Map(societyRows.map((r) => [r.row.id, r.row.name]));
  const sectorNames = new Map(sectorRows.map((r) => [r.id, r.name]));
  const cityNames = new Map(cityRows.map((r) => [r.row.id, r.row.name]));

  const societyCount = new Map<string, number>();
  for (const r of societyRows) {
    societyCount.set(r.row.cityId, (societyCount.get(r.row.cityId) ?? 0) + 1);
  }
  const sectorCount = new Map<string, number>();
  for (const r of sectorRows) {
    sectorCount.set(r.societyId, (sectorCount.get(r.societyId) ?? 0) + 1);
  }
  const unitCount = new Map<string, number>();
  const sectorSociety = new Map<string, string>();
  for (const r of unitRows) {
    const sectorId = r.unit.sectorId;
    unitCount.set(sectorId, (unitCount.get(sectorId) ?? 0) + 1);
    sectorSociety.set(sectorId, r.sectorSocietyId);
  }

  const cities: GeoCity[] = cityRows.map(({ row, centerPointWkt }) => ({
    ...toCity(row),
    centerPoint: centerPointWkt ?? row.centerPoint ?? null,
    societyCount: societyCount.get(row.id) ?? 0,
  }));

  const societies: GeoSociety[] = societyRows.map(({ row, boundaryWkt }) => ({
    ...toSociety(row),
    boundary: boundaryWkt ?? row.boundary ?? null,
    city: cityNames.get(row.cityId) ?? null,
    sectorCount: sectorCount.get(row.id) ?? 0,
  }));

  const sectors: GeoSector[] = sectorRows.map((row) => ({
    ...toSector(row),
    unitCount: unitCount.get(row.id) ?? 0,
  }));

  const units: GeoUnit[] = unitRows.map((r) => {
    const societyId = r.sectorSocietyId;
    return {
      id: r.unit.id,
      sectorId: r.unit.sectorId,
      unitNumber: r.unit.unitNumber,
      streetNumber: r.unit.streetNumber ?? null,
      lat: r.lat ?? 0,
      lng: r.lng ?? 0,
      areaValue: r.unit.areaValue ?? null,
      areaUnit: r.unit.areaUnit ?? null,
      type: r.unit.type ?? null,
      createdAt: iso(r.unit.createdAt),
      updatedAt: iso(r.unit.updatedAt),
      societyId,
      societyName: societyNames.get(societyId) ?? null,
      sectorName: sectorNames.get(r.unit.sectorId) ?? null,
      cityName: rowCityName(societyId),
    };
  });

  function rowCityName(societyId: string): string | null {
    const society = societyRows.find((s) => s.row.id === societyId);
    if (!society) return null;
    return cityNames.get(society.row.cityId) ?? null;
  }

  return { cities, societies, sectors, units };
}