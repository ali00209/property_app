"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import {
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Heading,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Switch,
  Stepper,
  FileInput,
  Slider,
  StackItem,
} from "@astryxdesign/core";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPinned, Plus } from "lucide-react";
import type { Map as LeafletMap, Polygon as LeafletPolygon } from "leaflet";
import {
  areaUnitFilter,
  unitTypeString,
  provinceFilter,
  societyKindFilter,
} from "@/lib/constants";
import type { City, Unit, Society, SocietySector } from "@/types";
import {
  FormDialog,
  FormWizard,
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

function pointsFromLayer(layer: LeafletPolygon | null): LatLngPair[] {
  if (!layer) return [];
  const ring = layer.getLatLngs()[0] as { lat: number; lng: number }[];
  return ring.map(({ lng, lat }) => [lng, lat] as LatLngPair);
}

function samePoints(a: LatLngPair[], b: LatLngPair[]): boolean {
  return (
    a.length === b.length &&
    a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])
  );
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

function PointPicker({
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

function BoundaryImageOverlay({
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
  const imageLayerRef = useRef<import("leaflet").ImageOverlay | null>(null);
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
    imageLayerRef.current = null;

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
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [points, setPoints] = useState<LatLngPair[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(0.75);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    form.reset(
      editing
        ? {
            cityId: editing.cityId,
            name: editing.name,
            kind: editing.kind,
            developer: editing.developer ?? null,
            regulatoryAuthority: editing.regulatoryAuthority ?? null,
            boundary: editing.boundary ?? "",
            coverImage: editing.coverImage ?? null,
            isActive: editing.isActive,
          }
        : { ...societyDefaults, cityId },
    );
    setPoints(pointsFromPolygonWkt(editing?.boundary));
    setImageFile(null);
    setImageUrl(editing?.coverImage ?? null);
    setOpacity(0.75);
    setErrorMessage(null);
  }, [isOpen, editing, cityId, form]);

  const previewUrl = useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return imageUrl;
  }, [imageFile, imageUrl]);

  useEffect(() => {
    if (!previewUrl || !imageFile) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, imageFile]);

  const city = cities.find((c) => c.id === cityId);
  const cityCenter = city?.centerPoint;
  const focus = editing ? null : pointFromWkt(cityCenter ?? null);

  const submit = form.handleSubmit(async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    let finalCoverImage: string | null = imageUrl;

    if (imageFile) {
      try {
        const uploadData = new FormData();
        uploadData.append("coverImage", imageFile);
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: uploadData,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          files?: Array<{ url: string }>;
          error?: string;
        };
        if (json.ok && json.files?.[0]?.url) {
          finalCoverImage = json.files[0].url;
        } else {
          setIsSubmitting(false);
          setErrorMessage(json.error ?? "Failed to upload boundary image.");
          return;
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to upload boundary image.",
        );
        return;
      }
    }

    const payload: SocietyFormValues = {
      ...values,
      boundary: points.length >= 3 ? polygonWktFromPoints(points) : "",
      coverImage: finalCoverImage,
    };

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

  const next = async () => {
    if (step === 0) {
      const valid = await form.trigger(["cityId", "name", "kind"]);
      if (valid) {
        setErrorMessage(null);
        setStep(1);
      }
    } else if (step === 1) {
      if (points.length > 0 && points.length < 3) {
        setErrorMessage(
          "Please finish drawing the boundary polygon (at least 3 corners) before continuing.",
        );
        return;
      }
      setErrorMessage(null);
      setStep(2);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      purpose="form"
      width={800}
    >
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={editing ? "Edit society" : "New society"}
              subtitle={
                step === 0
                  ? "Societies are the neighbourhoods shown on the map."
                  : step === 1
                    ? "Mark the perimeter of the society on the map."
                    : "Overlay a master plan or layout image over the marked boundary."
              }
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            {step === 0 ? (
              <FormLayout>
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
              </FormLayout>
            ) : null}
            {isOpen && step === 1 ? (
              <MapEditor points={points} onChange={setPoints} focus={focus} />
            ) : null}
            {isOpen && step === 2 ? (
              <Stack gap={3}>
                {points.length >= 3 ? (
                  <>
                    <Stack direction="horizontal" gap={3} vAlign="end">
                      <StackItem size="fill">
                        <FileInput
                          label="Boundary overlay image"
                          description="Upload a master plan, layout plan, or map image to overlay on the marked boundaries."
                          value={imageFile}
                          onChange={(files) => {
                            const file = Array.isArray(files)
                              ? files[0]
                              : files;
                            setImageFile(file ?? null);
                          }}
                          accept="image/*"
                          isOptional
                        />
                      </StackItem>
                      {previewUrl ? (
                        <Button
                          label="Remove image"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImageUrl(null);
                          }}
                        />
                      ) : null}
                    </Stack>

                    {imageUrl && !imageFile ? (
                      <Text type="body" color="secondary">
                        Current saved image: {imageUrl.split("/").pop()}
                      </Text>
                    ) : null}

                    {previewUrl ? (
                      <Slider
                        label="Overlay opacity"
                        value={Math.round(opacity * 100)}
                        onChange={(val: number | [number, number]) =>
                          setOpacity(
                            typeof val === "number" ? val / 100 : val[0] / 100,
                          )
                        }
                        min={10}
                        max={100}
                        step={5}
                        formatValue={(val) => `${val}%`}
                      />
                    ) : null}

                    <BoundaryImageOverlay
                      points={points}
                      imageUrl={previewUrl}
                      opacity={opacity}
                      focus={focus}
                    />
                  </>
                ) : (
                  <Stack gap={2}>
                    <Text type="body" color="secondary">
                      No boundary has been marked. Please go back to the Boundary
                      step to mark the society boundary on the map first to overlay an image.
                    </Text>
                  </Stack>
                )}
              </Stack>
            ) : null}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <FormWizard
              step={step}
              steps={["Details", "Boundary", "Image Overlay"]}
              onBack={() => {
                setErrorMessage(null);
                setStep((value) => value - 1);
              }}
              onNext={next}
              onSubmit={() => submit()}
              canSubmit={step === 2}
              isSubmitting={isSubmitting}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
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
  societyCoverImage,
  cityCenter,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Unit | null;
  sectorId: string;
  societyBoundary?: string | null;
  societyCoverImage?: string | null;
  cityCenter?: string | null;
}) {
  const router = useRouter();
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
    defaultValues: { ...unitDefaults, sectorId },
    mode: "onBlur",
  });
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    form.reset(
      editing
        ? {
            sectorId,
            unitNumber: editing.unitNumber,
            streetNumber: editing.streetNumber ?? null,
            areaValue:
              editing.areaValue != null ? Number(editing.areaValue) : null,
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

  const next = async () => {
    const valid = await form.trigger(["unitNumber"]);
    if (valid) setStep((value) => value + 1);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      purpose="form"
      width={720}
    >
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={editing ? `Edit unit ${editing.unitNumber}` : "New unit"}
              subtitle="Mark the unit location on the map. Optionally add area and type."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            {step === 0 ? (
              <FormLayout>
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
              </FormLayout>
            ) : null}
            {isOpen && step === 1 ? (
              <PointPicker
                point={point}
                onChange={setPoint}
                boundary={societyBoundary}
                cityCenter={cityCenter}
                overlayImage={societyCoverImage}
              />
            ) : null}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <FormWizard
              step={step}
              steps={["Details", "Location"]}
              onBack={() => setStep((value) => value - 1)}
              onNext={next}
              onSubmit={() => submit()}
              canSubmit={step === 1 && Boolean(point)}
              isSubmitting={isSubmitting}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
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
        societyCoverImage={unitSociety?.coverImage ?? null}
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
