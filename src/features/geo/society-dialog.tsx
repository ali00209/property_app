"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogHeader,
  FileInput,
  FormLayout,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Slider,
  Stack,
  StackItem,
  Switch,
  Text,
} from "@astryxdesign/core";
import { societyKindFilter } from "@/lib/constants";
import type { Society } from "@/types";
import { SelectField, TextField, FormWizard } from "@/components/ui";
import { createSocietyAction, updateSocietyAction } from "./actions";
import {
  societySchema,
  societyDefaults,
  type SocietyFormValues,
} from "./validations";
import { MapEditor } from "./map-editor";
import { BoundaryImageOverlay } from "./boundary-image-overlay";
import {
  pointFromWkt,
  pointsFromPolygonWkt,
  polygonWktFromPoints,
  type LatLngPair,
} from "./wkt";

export function SocietyDialog({
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
                      No boundary has been marked. Please go back to the
                      Boundary step to mark the society boundary on the map
                      first to overlay an image.
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
