"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { Stack, Text } from "@astryxdesign/core";
import { currency } from "@/lib/utils";
import type { MapPayload } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  available: "#16a34a",
  off_market: "#2563eb",
  occupied: "#ea580c",
  vacant: "#64748b",
  maintenance: "#0d9488",
  archived: "#94a3b8",
};

const DEFAULT_STATUS_COLOR = "#3b82f6";

const CITY_COLOR = "#2563eb";
const SOCIETY_COLOR = "#9333ea";
const UNIT_COLOR = "#0d9488";

function polygonLatLngsFromWkt(wkt: string): [number, number][] {
  const match = wkt.match(/\(\(([^)]+)\)\)/);
  if (!match) return [];
  return match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lat, lng] as [number, number];
  });
}

export function MapPage({ payload }: { payload: MapPayload }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const modRef = useRef<typeof import("leaflet") | null>(null);
  const groupsRef = useRef<Record<string, LayerGroup>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    const init = async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;
      modRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      groupsRef.current = {
        cities: L.layerGroup().addTo(map),
        societies: L.layerGroup().addTo(map),
        units: L.layerGroup().addTo(map),
        properties: L.layerGroup().addTo(map),
      };
      setReady(true);
    };

    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = modRef.current;
    if (!map || !L || !ready) return;

    for (const group of Object.values(groupsRef.current)) group.clearLayers();

    const all: Array<[number, number]> = [];

    for (const c of payload.cities) {
      L.circleMarker([c.lat, c.lng], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: CITY_COLOR,
        fillOpacity: 1,
      })
        .bindTooltip(`${c.city} · ${c.count}`, { direction: "top", offset: [0, -10] })
        .addTo(groupsRef.current.cities);
      all.push([c.lat, c.lng]);
    }

    for (const a of payload.areas) {
      const latlngs = a.boundary ? polygonLatLngsFromWkt(a.boundary) : [];
      const label = `${a.area}, ${a.city} · ${a.count}`;
      if (latlngs.length >= 3) {
        if (a.coverImage) {
          L.imageOverlay(a.coverImage, L.latLngBounds(latlngs), {
            opacity: 0.65,
            interactive: false,
          }).addTo(groupsRef.current.societies);
        }
        L.polygon(latlngs, {
          color: SOCIETY_COLOR,
          weight: 2,
          fillOpacity: a.coverImage ? 0.05 : 0.15,
        })
          .bindTooltip(label, { sticky: true })
          .addTo(groupsRef.current.societies);
        all.push(...latlngs);
      } else {
        L.circleMarker([a.lat, a.lng], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: SOCIETY_COLOR,
          fillOpacity: 1,
        })
          .bindTooltip(label, { direction: "top", offset: [0, -8] })
          .addTo(groupsRef.current.societies);
        all.push([a.lat, a.lng]);
      }
    }

    for (const u of payload.units) {
      L.circleMarker([u.lat, u.lng], {
        radius: 4,
        color: "#ffffff",
        weight: 1,
        fillColor: UNIT_COLOR,
        fillOpacity: 1,
      })
        .bindTooltip(u.unitNumber, { direction: "top", offset: [0, -6] })
        .addTo(groupsRef.current.units);
      all.push([u.lat, u.lng]);
    }

    for (const p of payload.properties) {
      const color = STATUS_COLOR[p.status] ?? DEFAULT_STATUS_COLOR;
      L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(
          `<strong>${p.title}</strong><br/>${p.city}${p.area ? `, ${p.area}` : ""}<br/>${currency(p.price)} · ${p.type.replace("_", " ")} · ${p.status.replace("_", " ")}<br/><a href="/dashboard/properties/${p.id}">View details →</a>`,
          { maxWidth: 280 },
        )
        .addTo(groupsRef.current.properties);
      all.push([p.lat, p.lng]);
    }

    if (all.length) {
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
    } else {
      map.setView([30.3753, 69.3451], 5);
    }
  }, [payload, ready]);

  return (
    <Stack gap={3}>
      <Stack>
        <Text type="label">All locations</Text>
        <Text type="body" color="secondary">
          {payload.cities.length} cities · {payload.areas.length} societies ·{" "}
          {payload.units.length} units · {payload.properties.length} properties
        </Text>
      </Stack>

      <div
        ref={containerRef}
        style={{ width: "100%", height: 640, borderRadius: 12, zIndex: 0 }}
      />
    </Stack>
  );
}
