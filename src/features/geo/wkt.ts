import type { Polygon as LeafletPolygon } from "leaflet";

export type LatLngPair = [number, number];

export function pointsFromPolygonWkt(
  wkt: string | null | undefined,
): LatLngPair[] {
  if (!wkt) return [];
  const match = wkt.match(/\(\(([^)]+)\)\)/);
  if (!match) return [];
  return match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat] as LatLngPair;
  });
}

export function polygonWktFromPoints(points: LatLngPair[]): string {
  const ring = [...points, points[0]];
  return `POLYGON((${ring
    .map(([lng, lat]) => `${lng.toFixed(6)} ${lat.toFixed(6)}`)
    .join(", ")}))`;
}

export function pointFromWkt(
  wkt: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\(([^)]+)\)/);
  if (!match) return null;
  const [lng, lat] = match[1].trim().split(/\s+/).map(Number);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return { lat, lng };
}

export function pointsFromLayer(layer: LeafletPolygon | null): LatLngPair[] {
  if (!layer) return [];
  const ring = layer.getLatLngs()[0] as { lat: number; lng: number }[];
  return ring.map(({ lng, lat }) => [lng, lat] as LatLngPair);
}

export function samePoints(a: LatLngPair[], b: LatLngPair[]): boolean {
  return (
    a.length === b.length &&
    a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])
  );
}
