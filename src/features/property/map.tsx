"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { Button, Stack, Text } from "@astryxdesign/core";
import { currency } from "@/lib/utils";
import type { MapArea, MapPayload, MapProperty } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  available: "#16a34a",
  off_market: "#2563eb",
  occupied: "#ea580c",
  vacant: "#64748b",
  maintenance: "#0d9488",
  archived: "#94a3b8",
}

const DEFAULT_STATUS_COLOR = "#3b82f6"

type Drill = {
  level: "cities" | "areas" | "properties"
  city: string | null
  area: string | null
  areaId: string | null
}

function polygonLatLngsFromWkt(wkt: string): [number, number][] {
  const match = wkt.match(/\(\(([^)]+)\)\)/)
  if (!match) return []
  return match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number)
    return [lat, lng] as [number, number]
  })
}

export function MapTab({
  payload,
}: {
  payload: MapPayload
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const modRef = useRef<typeof import("leaflet") | null>(null)
  const groupsRef = useRef<Record<string, LayerGroup>>({})
  const [ready, setReady] = useState(false)
  const [drill, setDrill] = useState<Drill>({
    level: "cities",
    city: null,
    area: null,
    areaId: null,
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let disposed = false

    const init = async () => {
      const L = await import("leaflet")
      if (disposed || !containerRef.current) return
      modRef.current = L
      const map = L.map(containerRef.current, {
        zoomControl: true,
      })
      mapRef.current = map
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)
      groupsRef.current = {
        cities: L.layerGroup().addTo(map),
        areas: L.layerGroup().addTo(map),
        properties: L.layerGroup().addTo(map),
      }

      const bounds = L.latLngBounds(
        payload.cities.map((city) => [city.lat, city.lng] as [number, number]),
      )
      if (payload.cities.length) {
        map.fitBounds(bounds, { padding: [40, 40] })
      } else {
        map.setView([30.3753, 69.3451], 5)
      }
      setReady(true)
    }

    init()
    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearGroups = useCallback(
    (keys: string[]) => {
      for (const key of keys) {
        groupsRef.current[key]?.clearLayers()
      }
    },
    [],
  )

  function dotIcon(
    L: typeof import("leaflet"),
    color: string,
    size: number,
    label?: string,
  ) {
    const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)">${label ?? ""}</div>`
    return L.divIcon({
      className: "",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  function unitIcon(L: typeof import("leaflet"), label: string) {
    const html = `<div style="display:flex;align-items:center;gap:3px;transform:translate(-6px,-100%)"><div style="width:11px;height:11px;border-radius:50%;background:#0d9488;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div><span style="font-size:10px;font-weight:600;line-height:1.4;color:#0f172a;background:#fff;border:1px solid #cbd5e1;border-radius:4px;padding:0 4px;white-space:nowrap">${label}</span></div>`
    return L.divIcon({
      className: "",
      html,
      iconSize: [label.length * 8 + 16, 22],
      iconAnchor: [0, 0],
    })
  }

  useEffect(() => {
    const map = mapRef.current
    const L = modRef.current
    if (!map || !L || !ready) return
    clearGroups(["cities", "areas", "properties"])
    if (!payload.cities.length) return

    const { level, city } = drill

    if (level === "cities") {
      for (const c of payload.cities) {
        const marker = L.marker([c.lat, c.lng], {
          icon: dotIcon(L, "#2563eb", 20),
          title: c.city,
        }).addTo(groupsRef.current.cities)
        marker.bindTooltip(c.city, { direction: "top", offset: [0, -12] })
        marker.on("click", () => {
          map.flyTo([c.lat, c.lng], 11)
          setDrill({ level: "areas", city: c.city, area: null, areaId: null })
        })
      }
      return
    }

    if (level === "areas") {
      const areas = payload.areas.filter((a) => a.city === city)
      const bounds: Array<[number, number]> = []
      const unitsFor = (a: MapArea) => {
        const areaId = a.id
        map.flyTo([a.lat, a.lng], 15)
        setDrill({ level: "properties", city: city, area: a.area, areaId })
      }
      for (const a of areas) {
        const latlngs = a.boundary ? polygonLatLngsFromWkt(a.boundary) : []
        if (latlngs.length >= 3) {
          const poly = L.polygon(latlngs, {
            color: "#9333ea",
            weight: 2,
            fillOpacity: 0.18,
          }).addTo(groupsRef.current.areas)
          poly.bindTooltip(`${a.area} · ${a.count}`, { sticky: true })
          poly.on("click", () => unitsFor(a))
          const label = L.marker(poly.getBounds().getCenter(), {
            icon: dotIcon(L, "#9333ea", 16),
          }).addTo(groupsRef.current.areas)
          label.bindTooltip(`${a.area} · ${a.count}`, { direction: "top", offset: [0, -10] })
          label.on("click", () => unitsFor(a))
          bounds.push(...latlngs)
        } else {
          const marker = L.marker([a.lat, a.lng], {
            icon: dotIcon(L, "#9333ea", 16),
            title: `${a.area} (${a.count})`,
          }).addTo(groupsRef.current.areas)
          marker.bindTooltip(`${a.area} · ${a.count}`, { direction: "top", offset: [0, -10] })
          marker.on("click", () => unitsFor(a))
          bounds.push([a.lat, a.lng])
        }
      }
      const areaIds = new Set(areas.map((a) => a.id))
      for (const p of payload.units) {
        if (!areaIds.has(p.societyId)) continue
        const icon = unitIcon(L, p.unitNumber)
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(
          groupsRef.current.areas,
        )
        marker.bindTooltip(p.unitNumber, { direction: "top", offset: [0, -6] })
        bounds.push([p.lat, p.lng])
      }
      if (bounds.length) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] })
      }
      return
    }

    const props = payload.properties.filter(
      (p) =>
        p.city === city &&
        (drill.areaId ? p.societyId === drill.areaId : true),
    )

    for (const p of props) {
      addPropertyMarker(L, p)
    }
    if (props.length) {
      map.fitBounds(
        L.latLngBounds(props.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [40, 40] },
      )
    }
  }, [drill, payload, clearGroups, ready])

  function addPropertyMarker(
    L: typeof import("leaflet"),
    p: MapProperty,
  ) {
    const color = STATUS_COLOR[p.status] ?? DEFAULT_STATUS_COLOR
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(
      groupsRef.current.properties,
    )
    const label = `${p.title} · ${p.city}${p.area ? `, ${p.area}` : ""}`
    const meta = `${currency(p.price)} · ${p.type.replace("_", " ")} · ${p.status.replace("_", " ")}`
    marker.bindPopup(
      `<strong>${label}</strong><br/>${meta}<br/><a href="/dashboard/properties/${p.id}">View details →</a>`,
      { maxWidth: 280 },
    )
  }

  const areas = payload.areas.filter((a) => a.city === drill.city)
  const props = payload.properties.filter(
    (p) =>
      p.city === drill.city &&
      (drill.areaId ? p.societyId === drill.areaId : true),
  )

  return (
    <Stack gap={3}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Text type="label">
            {drill.level === "cities"
              ? "All cities"
              : drill.level === "areas"
                ? drill.city
                : `${drill.area} · ${drill.city}`}
          </Text>
          <Text type="body" color="secondary">
            {drill.level === "cities"
              ? `${payload.cities.length} cities`
              : drill.level === "areas"
                ? `${areas.length} areas`
                : `${props.length} propert${props.length === 1 ? "y" : "ies"}`}
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={2}>
          {drill.level !== "cities" && drill.area ? (
            <Button
              label="Back to areas"
              size="sm"
              variant="ghost"
              onClick={() =>
                setDrill({ level: "areas", city: drill.city, area: null, areaId: null })
              }
            />
          ) : null}
          {drill.level !== "cities" ? (
            <Button
              label="All cities"
              size="sm"
              variant="ghost"
              onClick={() =>
                setDrill({ level: "cities", city: null, area: null, areaId: null })
              }
            />
          ) : null}
        </Stack>
      </Stack>

      <div
        ref={containerRef}
        style={{ width: "100%", height: 560, borderRadius: 12, zIndex: 0 }}
      />
    </Stack>
  )
}
