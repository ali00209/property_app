"use client";

import { useEffect, useRef, useState } from "react";
import { Stack, Text } from "@astryxdesign/core";
import type { Map as LeafletMap } from "leaflet";
import { pointFromWkt, pointsFromPolygonWkt } from "./wkt";

export function PointPicker({
  point,
  onChange,
  boundary,
  cityCenter,
  overlayImage,
}: {
  point: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  boundary?: string | null;
  cityCenter?: string | null;
  overlayImage?: string | null;
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
      const latlngs = pointsFromPolygonWkt(boundary).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      if (latlngs.length >= 3) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
      } else if (point) {
        map.setView([point.lat, point.lng], 16);
      } else {
        const city = pointFromWkt(cityCenter ?? null);
        map.setView(city ? [city.lat, city.lng] : [31.5204, 74.3587], 13);
      }
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
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

    const latlngs = pointsFromPolygonWkt(boundary).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    if (latlngs.length >= 3) {
      if (overlayImage) {
        L.imageOverlay(overlayImage, L.latLngBounds(latlngs), {
          opacity: 0.65,
          interactive: false,
        }).addTo(overlay);
      }
      L.polygon(latlngs, {
        color: "#9333ea",
        weight: 1.5,
        fillOpacity: overlayImage ? 0.05 : 0.12,
        interactive: false,
      }).addTo(overlay);
    }
    if (point) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([point.lat, point.lng], { icon }).addTo(overlay);
    }
  }, [point, boundary, overlayImage, ready]);

  return (
    <Stack gap={2}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 380, borderRadius: 8, zIndex: 0 }}
      />
      <Text type="body" color="secondary">
        {point ? (
          <>
            Unit marked at {point.lat.toFixed(6)}, {point.lng.toFixed(6)} —
            click the map to move it.
          </>
        ) : (
          "Click on the map to place the unit location. The society outline is shown for reference."
        )}
      </Text>
    </Stack>
  );
}
