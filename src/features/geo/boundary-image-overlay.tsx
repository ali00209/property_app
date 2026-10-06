"use client";

import { useEffect, useRef, useState } from "react";
import { Stack, Text } from "@astryxdesign/core";
import type { Map as LeafletMap } from "leaflet";
import type { LatLngPair } from "./wkt";

export function BoundaryImageOverlay({
  points,
  imageUrl,
  opacity,
  focus,
}: {
  points: LatLngPair[];
  imageUrl: string | null;
  opacity: number;
  focus?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const modRef = useRef<typeof import("leaflet") | null>(null);
  const overlayRef = useRef<import("leaflet").LayerGroup | null>(null);
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
      overlayRef.current = L.layerGroup().addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const latlngs = points.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      if (latlngs.length >= 3) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
      } else {
        const lat = focus?.lat ?? 31.5204;
        const lng = focus?.lng ?? 74.3587;
        map.setView([lat, lng], focus ? 15 : 13);
      }
      setReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    };

    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = modRef.current;
    const overlay = overlayRef.current;
    if (!map || !L || !overlay || !ready) return;

    overlay.clearLayers();

    if (points.length < 3) return;

    const latlngs = points.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    const bounds = L.latLngBounds(latlngs);

    if (imageUrl) {
      L.imageOverlay(imageUrl, bounds, {
        opacity,
        interactive: false,
      }).addTo(overlay);
    }

    L.polygon(latlngs, {
      color: "#9333ea",
      weight: 2,
      fillOpacity: imageUrl ? 0.05 : 0.2,
      dashArray: "4, 4",
      interactive: false,
    }).addTo(overlay);
  }, [points, imageUrl, opacity, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const L = modRef.current;
    if (!map || !L || !ready || points.length < 3) return;
    const latlngs = points.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
  }, [points, ready]);

  return (
    <Stack gap={2}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 380, borderRadius: 8, zIndex: 0 }}
      />
      <Text type="body" color="secondary">
        {imageUrl
          ? "Image overlaid across the marked boundary. You can adjust the opacity slider to check alignment with the map."
          : "Boundary outline shown. Choose an image above to overlay it on top of these boundaries."}
      </Text>
    </Stack>
  );
}
