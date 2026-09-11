"use client";

import "leaflet/dist/leaflet.css";

import {
  Button,
  Heading,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Switch,
} from "@astryxdesign/core";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPinned, Plus } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import {
  areaUnitFilter,
  unitTypeString,
  provinceFilter,
  societyKindFilter,
} from "@/lib/constants";
import type { City, Unit, Society, SocietySector } from "@/types";
import {
  FormDialog,
  SelectField,
  TextField,
  NumberField as NumField,
} from "@/components/ui";
import DeleteDialog from "@/components/delete-dialog";
import type { GeoTree } from "./db-queries";
import {
  createCityAction,
  createUnitAction,
  createSectorAction,
  createSocietyAction,
  deleteCityAction,
  deleteUnitAction,
  deleteSectorAction,
  deleteSocietyAction,
  updateCityAction,
  updateUnitAction,
  updateSectorAction,
  updateSocietyAction,
} from "./actions";
import {
  citySchema,
  cityDefaults,
  unitSchema,
  unitDefaults,
  sectorSchema,
  sectorDefaults,
  societySchema,
  societyDefaults,
  type CityFormValues,
  type UnitFormValues,
  type SectorFormValues,
  type SocietyFormValues,
} from "./validations";

type LatLngPair = [number, number];

function pointsFromPolygonWkt(wkt: string | null | undefined): LatLngPair[] {
  if (!wkt) return [];
  const match = wkt.match(/\(\(([^)]+)\)\)/);
  if (!match) return [];
  return match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat] as LatLngPair;
  });
}

function polygonWktFromPoints(points: LatLngPair[]): string {
  const ring = [...points, points[0]];
  return `POLYGON((${ring
    .map(([lng, lat]) => `${lng.toFixed(6)} ${lat.toFixed(6)}`)
    .join(", ")}))`;
}

function pointFromWkt(
  wkt: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\(([^)]+)\)/);
  if (!match) return null;
  const [lng, lat] = match[1].trim().split(/\s+/).map(Number);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return { lat, lng };
}

function MapEditor({
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
  const overlayRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pointsRef = useRef(points);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    const init = async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;
      modRef.current = L;
      const lat = focus?.lat ?? 31.5204;
      const lng = focus?.lng ?? 74.3587;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        [lat, lng],
        focus ? 15 : 13,
      );
      mapRef.current = map;
      overlayRef.current = L.layerGroup().addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const current = pointsRef.current;
        onChange([...current, [e.latlng.lng, e.latlng.lat]]);
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
    const overlay = overlayRef.current;
    if (!map || !L || !overlay || !ready) return;
    overlay.clearLayers();

    if (points.length === 0) return;
    const latlngs = points.map(([lng, lat]) => [lat, lng] as [number, number]);
    if (points.length >= 3) {
      L.polygon(latlngs, { color: "#16a34a", fillOpacity: 0.25 }).addTo(
        overlay,
      );
    } else if (points.length >= 2) {
      L.polyline(latlngs, { color: "#16a34a" }).addTo(overlay);
    }
    for (const [lng, lat] of points) {
      L.circleMarker([lat, lng], {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#dc2626",
        fillOpacity: 1,
      }).addTo(overlay);
    }
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }
  }, [points, ready]);

  return (
    <Stack gap={2}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 420, borderRadius: 8, zIndex: 0 }}
      />
      {points.length > 0 ? (
        <Stack direction="horizontal" hAlign="between" vAlign="center">
          <Text type="body" color="secondary">
            {points.length} marker{points.length === 1 ? "" : "s"} — click the
            map to add corners,{" "}
            {points.length >= 3
              ? "polygon is ready to save."
              : "add at least 3 corners."}
          </Text>
          <Button
            label="Undo last"
            size="sm"
            variant="ghost"
            onClick={() => onChange(points.slice(0, -1))}
          />
        </Stack>
      ) : (
        <Text type="body" color="secondary">
          Click on the map to mark the corners of the boundary.
        </Text>
      )}
    </Stack>
  );
}

function PointPicker({
  point,
  onChange,
  boundary,
  cityCenter,
}: {
  point: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  boundary?: string | null;
  cityCenter?: string | null;
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
      L.polygon(latlngs, {
        color: "#9333ea",
        weight: 1.5,
        fillOpacity: 0.12,
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
  }, [point, boundary, ready]);

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

function CityDialog({
  isOpen,
  onClose,
  editing,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: City | null;
}) {
  const router = useRouter();
  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema) as Resolver<CityFormValues>,
    defaultValues: cityDefaults,
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      editing
        ? { name: editing.name, province: editing.province ?? null }
        : cityDefaults,
    );
    setErrorMessage(null);
  }, [isOpen, editing, form]);

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = editing
      ? await updateCityAction(editing.id, values)
      : await createCityAction(values);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? "Edit city" : "New city"}
      subtitle="Cities are the top level of the address map."
      onSubmit={() => submit()}
      isSubmitting={isSubmitting}
      submitLabel={editing ? "Save changes" : "Create city"}
    >
      <Stack gap={3}>
        <TextField
          form={form}
          name="name"
          label="Name"
          isRequired
          placeholder="e.g. Lahore"
        />
        <SelectField
          form={form}
          name="province"
          label="Province"
          isOptional
          options={[
            { value: "", label: "—" },
            ...provinceFilter.map((p) => ({ value: p.value, label: p.label })),
          ]}
        />
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>
    </FormDialog>
  );
}

function SocietyDialog({
  isOpen,
  onClose,
  editing,
  cityId,
  cities,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Society | null;
  cityId: string;
  cities: Array<{ id: string; name: string; centerPoint?: string | null }>;
}) {
  const router = useRouter();
  const form = useForm<SocietyFormValues>({
    resolver: zodResolver(societySchema) as Resolver<SocietyFormValues>,
    defaultValues: { ...societyDefaults, cityId },
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [points, setPoints] = useState<LatLngPair[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      editing
        ? {
            cityId: editing.cityId,
            name: editing.name,
            kind: editing.kind,
            developer: editing.developer ?? null,
            regulatoryAuthority: editing.regulatoryAuthority ?? null,
            isActive: editing.isActive,
          }
        : { ...societyDefaults, cityId },
    );
    setPoints(pointsFromPolygonWkt(editing?.boundary));
    setErrorMessage(null);
  }, [isOpen, editing, cityId, form]);

  const city = cities.find((c) => c.id === cityId);
  const cityCenter = city?.centerPoint;
  const focus = editing ? null : pointFromWkt(cityCenter ?? null);

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      boundary: points.length >= 3 ? polygonWktFromPoints(points) : "",
    };
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = editing
      ? await updateSocietyAction(editing.id, payload)
      : await createSocietyAction(payload);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? "Edit society" : "New society"}
      subtitle="Societies are the neighbourhoods shown on the map."
      onSubmit={() => submit()}
      isSubmitting={isSubmitting}
      submitLabel={editing ? "Save changes" : "Create society"}
      width={800}
    >
      <Stack gap={3}>
        <SelectField
          form={form}
          name="cityId"
          label="City"
          isRequired
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextField
          form={form}
          name="name"
          label="Name"
          isRequired
          placeholder="e.g. DHA Phase 5"
        />
        <SelectField
          form={form}
          name="kind"
          label="Kind"
          isRequired
          options={societyKindFilter.map((k) => ({
            value: k.value,
            label: k.label,
          }))}
        />
        <TextField
          form={form}
          name="developer"
          label="Developer"
          isOptional
          placeholder="e.g. DHA Lahore"
        />
        <TextField
          form={form}
          name="regulatoryAuthority"
          label="Regulatory authority"
          isOptional
          placeholder="e.g. CDA, LDA, DHA"
        />
        {isOpen ? (
          <MapEditor points={points} onChange={setPoints} focus={focus} />
        ) : null}
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Switch
              label="Active"
              description="Inactive societies are hidden from new listings."
              value={Boolean(field.value)}
              onChange={field.onChange}
            />
          )}
        />
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>
    </FormDialog>
  );
}

function SectorDialog({
  isOpen,
  onClose,
  editing,
  societyId,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: SocietySector | null;
  societyId: string;
}) {
  const router = useRouter();
  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema) as Resolver<SectorFormValues>,
    defaultValues: { societyId, name: "" },
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      editing ? { societyId, name: editing.name } : { societyId, name: "" },
    );
    setErrorMessage(null);
  }, [isOpen, editing, societyId, form]);

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = editing
      ? await updateSectorAction(editing.id, values)
      : await createSectorAction(values);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? "Edit sector" : "New sector"}
      subtitle="Sectors (phases, blocks) group units under a society."
      onSubmit={() => submit()}
      isSubmitting={isSubmitting}
      submitLabel={editing ? "Save changes" : "Create sector"}
    >
      <Stack gap={3}>
        <TextField
          form={form}
          name="name"
          label="Name"
          isRequired
          placeholder="e.g. Block C"
        />
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>
    </FormDialog>
  );
}

function UnitDialog({
  isOpen,
  onClose,
  editing,
  sectorId,
  societyBoundary,
  cityCenter,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Unit | null;
  sectorId: string;
  societyBoundary?: string | null;
  cityCenter?: string | null;
}) {
  const router = useRouter();
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
    defaultValues: { ...unitDefaults, sectorId },
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      editing
        ? {
            sectorId,
            unitNumber: editing.unitNumber,
            streetNumber: editing.streetNumber ?? null,
            areaValue: editing.areaValue ?? null,
            areaUnit: editing.areaUnit ?? null,
            type: editing.type ?? null,
          }
        : { ...unitDefaults, sectorId },
    );
    setPoint(editing ? { lat: editing.lat, lng: editing.lng } : null);
    setErrorMessage(null);
  }, [isOpen, editing, sectorId, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!point) {
      setErrorMessage("Mark the unit location on the map first.");
      return;
    }
    const payload = {
      ...values,
      lat: String(point.lat),
      lng: String(point.lng),
    };
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = editing
      ? await updateUnitAction(editing.id, payload)
      : await createUnitAction(payload);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? `Edit unit ${editing.unitNumber}` : "New unit"}
      subtitle="Mark the unit location on the map. Optionally add area and type."
      onSubmit={() => submit()}
      isSubmitting={isSubmitting}
      submitLabel={editing ? "Save changes" : "Create unit"}
      width={720}
    >
      <Stack gap={3}>
        {isOpen ? (
          <PointPicker
            point={point}
            onChange={setPoint}
            boundary={societyBoundary}
            cityCenter={cityCenter}
          />
        ) : null}
        <TextField
          form={form}
          name="unitNumber"
          label="Unit number"
          isRequired
          placeholder="e.g. Unit 12-B"
        />
        <TextField
          form={form}
          name="streetNumber"
          label="Street number"
          isOptional
          placeholder="e.g. Street 4"
        />
        <Stack direction="horizontal" gap={3}>
          <NumField
            form={form}
            name="areaValue"
            label="Area"
            isOptional
            placeholder="0"
          />
          <SelectField
            form={form}
            name="areaUnit"
            label="Unit"
            isOptional
            options={[
              { value: "", label: "—" },
              ...areaUnitFilter.map((u) => ({
                value: u.value,
                label: u.label,
              })),
            ]}
          />
          <SelectField
            form={form}
            name="type"
            label="Unit type"
            isOptional
            options={[
              { value: "", label: "—" },
              ...unitTypeString.map((t) => ({
                value: t,
                label: t.replace("_", " "),
              })),
            ]}
          />
        </Stack>
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>
    </FormDialog>
  );
}

function kindLabel(kind: string): string {
  return societyKindFilter.find((k) => k.value === kind)?.label ?? kind;
}

export function GeoPage({ tree }: { tree: GeoTree }) {
  const router = useRouter();
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(
    null,
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const [cityOpen, setCityOpen] = useState(false);
  const [societyOpen, setSocietyOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingSociety, setEditingSociety] = useState<Society | null>(null);
  const [editingSector, setEditingSector] = useState<SocietySector | null>(
    null,
  );
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [deletingCity, setDeletingCity] = useState<City | null>(null);
  const [deletingSociety, setDeletingSociety] = useState<Society | null>(null);
  const [deletingSector, setDeletingSector] = useState<SocietySector | null>(
    null,
  );
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedCity = tree.cities.find((c) => c.id === selectedCityId) ?? null;
  const selectedSociety =
    tree.societies.find((s) => s.id === selectedSocietyId) ?? null;
  const selectedSector =
    tree.sectors.find((s) => s.id === selectedSectorId) ?? null;

  const citySocieties = tree.societies.filter(
    (s) => s.cityId === selectedCityId,
  );
  const societySectors = tree.sectors.filter(
    (s) => s.societyId === selectedSocietyId,
  );
  const sectorUnits = tree.units.filter((p) => p.sectorId === selectedSectorId);

  const unitSociety = selectedSector
    ? (tree.societies.find((s) => s.id === selectedSector.societyId) ?? null)
    : editingUnit
      ? (tree.societies.find(
          (s) =>
            s.id ===
            (tree.sectors.find((x) => x.id === editingUnit.sectorId)
              ?.societyId ?? null),
        ) ?? null)
      : null;
  const unitCity = unitSociety
    ? (tree.cities.find((c) => c.id === unitSociety.cityId) ?? null)
    : null;

  const handleDelete = async (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await fn();
    setIsDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error?.message ?? "Failed to delete.");
      return;
    }
    setDeletingCity(null);
    setDeletingSociety(null);
    setDeletingSector(null);
    setDeletingUnit(null);
    router.refresh();
  };

  const areaUnitLabel = (u: string | null | undefined) =>
    areaUnitFilter.find((x) => x.value === u)?.label ?? u ?? "—";

  return (
    <Stack gap={6}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={1}>Areas / Sectors</Heading>
          <Text type="body" color="secondary">
            City → Society → Sector → Unit. Societies, sectors and units are
            shown on the map and used when placing a property.
          </Text>
        </Stack>
        <Button
          icon={<Plus />}
          label="New city"
          variant="primary"
          onClick={() => {
            setEditingCity(null);
            setCityOpen(true);
          }}
        />
      </Stack>

      <Table dividers="rows" hasHover>
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>City</TableHeaderCell>
            <TableHeaderCell>Province</TableHeaderCell>
            <TableHeaderCell>Societies</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.cities.map((city) => (
            <TableRow
              key={city.id}
              onClick={() => {
                setSelectedCityId(city.id);
                setSelectedSocietyId(null);
                setSelectedSectorId(null);
              }}
            >
              <TableCell>
                <Text type="body">{city.name}</Text>
              </TableCell>
              <TableCell>
                <Text type="body">{city.province ?? "—"}</Text>
              </TableCell>
              <TableCell>
                <Text type="body">{city.societyCount}</Text>
              </TableCell>
              <TableCell>
                <Stack direction="horizontal" gap={2}>
                  <Button
                    label="Edit"
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setEditingCity(city);
                      setCityOpen(true);
                    }}
                  />
                  <Button
                    label="Delete"
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setDeletingCity(city);
                    }}
                  />
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedCity ? (
        <Stack gap={4}>
          <Stack direction="horizontal" hAlign="between" vAlign="center">
            <Stack direction="horizontal" gap={2} vAlign="center">
              <Button
                icon={<ArrowLeft />}
                label=""
                variant="ghost"
                onClick={() => setSelectedCityId(null)}
              />
              <Heading level={2}>{selectedCity.name} — societies</Heading>
            </Stack>
            <Button
              icon={<Plus />}
              label="New society"
              variant="primary"
              onClick={() => {
                setEditingSociety(null);
                setSocietyOpen(true);
              }}
            />
          </Stack>

          <Table dividers="rows" hasHover>
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Kind</TableHeaderCell>
                <TableHeaderCell>Developer</TableHeaderCell>
                <TableHeaderCell>Regulator</TableHeaderCell>
                <TableHeaderCell>Active</TableHeaderCell>
                <TableHeaderCell>Sectors</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {citySocieties.map((society) => (
                <TableRow
                  key={society.id}
                  onClick={() => {
                    setSelectedSocietyId(society.id);
                    setSelectedSectorId(null);
                  }}
                >
                  <TableCell>
                    <Text type="body">{society.name}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{kindLabel(society.kind)}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{society.developer ?? "—"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">
                      {society.regulatoryAuthority ?? "—"}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{society.isActive ? "Yes" : "No"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{society.sectorCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Stack direction="horizontal" gap={2}>
                      <Button
                        label="Edit"
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setEditingSociety(society);
                          setSocietyOpen(true);
                        }}
                      />
                      <Button
                        label="Delete"
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setDeletingSociety(society);
                        }}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedSociety ? (
            <Stack gap={4}>
              <Stack direction="horizontal" hAlign="between" vAlign="center">
                <Stack direction="horizontal" gap={2} vAlign="center">
                  <Button
                    icon={<ArrowLeft />}
                    label=""
                    variant="ghost"
                    onClick={() => setSelectedSocietyId(null)}
                  />
                  <Heading level={2}>{selectedSociety.name} — sectors</Heading>
                </Stack>
                <Button
                  icon={<Plus />}
                  label="New sector"
                  variant="primary"
                  onClick={() => {
                    setEditingSector(null);
                    setSectorOpen(true);
                  }}
                />
              </Stack>

              <Table dividers="rows" hasHover>
                <TableHeader>
                  <TableRow isHeaderRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Units</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societySectors.map((sector) => (
                    <TableRow
                      key={sector.id}
                      onClick={() => setSelectedSectorId(sector.id)}
                    >
                      <TableCell>
                        <Text type="body">{sector.name}</Text>
                      </TableCell>
                      <TableCell>
                        <Text type="body">{sector.unitCount}</Text>
                      </TableCell>
                      <TableCell>
                        <Stack direction="horizontal" gap={2}>
                          <Button
                            label="Edit"
                            size="sm"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setEditingSector(sector);
                              setSectorOpen(true);
                            }}
                          />
                          <Button
                            label="Delete"
                            size="sm"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setDeletingSector(sector);
                            }}
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedSector ? (
                <Stack gap={4}>
                  <Stack
                    direction="horizontal"
                    hAlign="between"
                    vAlign="center"
                  >
                    <Stack direction="horizontal" gap={2} vAlign="center">
                      <Button
                        icon={<ArrowLeft />}
                        label=""
                        variant="ghost"
                        onClick={() => setSelectedSectorId(null)}
                      />
                      <Heading level={2}>{selectedSector.name} — units</Heading>
                    </Stack>
                    <Button
                      icon={<Plus />}
                      label="New unit"
                      variant="primary"
                      onClick={() => {
                        setEditingUnit(null);
                        setUnitOpen(true);
                      }}
                    />
                  </Stack>

                  {sectorUnits.length === 0 ? (
                    <Stack gap={2} vAlign="center" hAlign="center">
                      <MapPinned />
                      <Text type="body" color="secondary">
                        No units yet. Add one with &quot;New unit&quot;.
                      </Text>
                    </Stack>
                  ) : (
                    <Table dividers="rows" hasHover>
                      <TableHeader>
                        <TableRow isHeaderRow>
                          <TableHeaderCell>Unit</TableHeaderCell>
                          <TableHeaderCell>Street</TableHeaderCell>
                          <TableHeaderCell>Area</TableHeaderCell>
                          <TableHeaderCell>Actions</TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectorUnits.map((unit) => (
                          <TableRow key={unit.id}>
                            <TableCell>
                              <Text type="body">{unit.unitNumber}</Text>
                            </TableCell>
                            <TableCell>
                              <Text type="body">
                                {unit.streetNumber ?? "—"}
                              </Text>
                            </TableCell>
                            <TableCell>
                              <Text type="body">
                                {unit.areaValue
                                  ? `${unit.areaValue} ${areaUnitLabel(unit.areaUnit)}`
                                  : "—"}
                              </Text>
                            </TableCell>
                            <TableCell>
                              <Stack direction="horizontal" gap={2}>
                                <Button
                                  label="Edit"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingUnit(unit);
                                    setUnitOpen(true);
                                  }}
                                />
                                <Button
                                  label="Delete"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingUnit(unit)}
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <CityDialog
        isOpen={cityOpen}
        onClose={() => setCityOpen(false)}
        editing={editingCity}
      />
      <SocietyDialog
        isOpen={societyOpen}
        onClose={() => setSocietyOpen(false)}
        editing={editingSociety}
        cityId={selectedCityId ?? editingSociety?.cityId ?? ""}
        cities={tree.cities}
      />
      <SectorDialog
        isOpen={sectorOpen}
        onClose={() => setSectorOpen(false)}
        editing={editingSector}
        societyId={selectedSocietyId ?? editingSector?.societyId ?? ""}
      />
      <UnitDialog
        isOpen={unitOpen}
        onClose={() => setUnitOpen(false)}
        editing={editingUnit}
        sectorId={selectedSectorId ?? editingUnit?.sectorId ?? ""}
        societyBoundary={unitSociety?.boundary ?? null}
        cityCenter={unitCity?.centerPoint ?? null}
      />

      {deleteError ? <Text color="accent">{deleteError}</Text> : null}

      <DeleteDialog
        title={`Delete ${deletingCity ? `city "${deletingCity.name}"` : deletingSociety ? `society "${deletingSociety.name}"` : deletingSector ? `sector "${deletingSector.name}"` : deletingUnit ? `unit ${deletingUnit.unitNumber}` : ""}?`}
        description="This removes the saved record. If it has children they must be removed first."
        isOpen={Boolean(
          deletingCity || deletingSociety || deletingSector || deletingUnit,
        )}
        setIsOpen={(open) => {
          if (!open) {
            setDeletingCity(null);
            setDeletingSociety(null);
            setDeletingSector(null);
            setDeletingUnit(null);
          }
        }}
        isLoading={isDeleting}
        onDelete={() => {
          if (deletingCity)
            return handleDelete(() => deleteCityAction(deletingCity.id));
          if (deletingSociety)
            return handleDelete(() => deleteSocietyAction(deletingSociety.id));
          if (deletingSector)
            return handleDelete(() => deleteSectorAction(deletingSector.id));
          if (deletingUnit)
            return handleDelete(() => deleteUnitAction(deletingUnit.id));
          return Promise.resolve({ ok: true });
        }}
      />
    </Stack>
  );
}
