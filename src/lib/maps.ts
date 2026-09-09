import "server-only";

const MAPBOX_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

interface Coordinates {
  latitude?: string
  longitude?: string
  formattedAddress?: string
}

interface GeocodeInput {
  street?: string
  city?: string
  state?: string
  zipCode?: string
}

export async function geocode(
  input: GeocodeInput,
): Promise<Coordinates> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) return {};

  const query = [
    input.street,
    input.city,
    input.state,
    input.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  if (!query.trim()) return {};

  try {
    const url = new URL(
      `${MAPBOX_ENDPOINT}/${encodeURIComponent(query)}.json`,
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "1");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return {};

    const body = (await res.json()) as {
      features?: Array<{ center?: [number, number]; place_name?: string }>
    };
    const feature = body.features?.[0];
    if (!feature?.center) return {};

    return {
      longitude: String(feature.center[0]),
      latitude: String(feature.center[1]),
      formattedAddress: feature.place_name,
    };
  } catch {
    return {};
  }
}