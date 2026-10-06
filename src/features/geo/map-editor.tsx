"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Stack, Text } from "@astryxdesign/core";
import type { Map as LeafletMap, Polygon as LeafletPolygon } from "leaflet";
import { pointsFromLayer, samePoints, type LatLngPair } from "./wkt";

export function MapEditor({
  points,
  onChange,
  focus,
}: {
  points: LatLngPair[];
  onChange: (points: LatLngPair[]) => void;
  focus?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const modRef = useRef<typeof import("leaflet") | null>(null);
  const layerRef = useRef<LeafletPolygon | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Geoman fires pm:create / pm:remove on the map, but pm:edit and
  // pm:markerdragend only on the layer, so edits are watched per layer.
  function trackLayer(layer: LeafletPolygon) {
    layerRef.current?.off();
    layerRef.current = layer;
    const push = () => onChangeRef.current(pointsFromLayer(layer));
    layer.on("pm:edit", push);
    layer.on("pm:markerdragend", push);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    const init = async () => {
      const L = await import("leaflet");
      await import("@geoman-io/leaflet-geoman-free");
      if (disposed || !containerRef.current) return;
      modRef.current = L;
      const lat = focus?.lat ?? 31.5204;
      const lng = focus?.lng ?? 74.3587;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        [lat, lng],
        focus ? 15 : 13,
      );
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.pm.setGlobalOptions({
        snappable: true,
        finishOn: "dblclick",
        pathOptions: { color: "#16a34a", fillOpacity: 0.25 },
        templineStyle: { color: "#16a34a" },
        hintlineStyle: { color: "#16a34a", dashArray: [5, 5] },
      });
      map.pm.addControls({
        position: "topleft",
        oneBlock: true,
        drawPolygon: true,
        editMode: true,
        removalMode: true,
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawText: false,
        drawCircle: false,
        cutPolygon: false,
        dragMode: false,
        rotateMode: false,
        optionsControls: false,
      });

      map.on("pm:create", (e) => {
        if (e.shape !== "Polygon") return;
        layerRef.current?.remove();
        trackLayer(e.layer as LeafletPolygon);
        onChangeRef.current(pointsFromLayer(layerRef.current));
      });
      map.on("pm:remove", (e) => {
        if (e.layer !== layerRef.current) return;
        layerRef.current = null;
        onChangeRef.current([]);
      });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = modRef.current;
    if (!map || !L || !ready) return;

    const current = layerRef.current;
    const unchanged =
      current === null
        ? points.length === 0
        : samePoints(pointsFromLayer(current), points);
    if (unchanged) return;

    current?.remove();
    layerRef.current = null;
    if (points.length < 3) return;

    const latlngs = points.map(([lng, lat]) => [lat, lng] as [number, number]);
    const layer = L.polygon(latlngs).addTo(map);
    trackLayer(layer);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
  }, [points, ready]);

  function clearBoundary() {
    layerRef.current?.remove();
    layerRef.current = null;
    onChangeRef.current([]);
  }

  return (
    <Stack gap={2}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 420, borderRadius: 8, zIndex: 0 }}
      />
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Text type="body" color="secondary">
          {points.length >= 3
            ? `${points.length} corners — drag them to adjust, or use the remove tool to clear.`
            : "Use the polygon tool to draw the boundary, then finish on the first corner or with a double click."}
        </Text>
        {points.length > 0 ? (
          <Button
            label="Clear boundary"
            size="sm"
            variant="ghost"
            onClick={clearBoundary}
          />
        ) : null}
      </Stack>
    </Stack>
  );
}
