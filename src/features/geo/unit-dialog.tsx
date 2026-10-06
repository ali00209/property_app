"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogHeader,
  FormLayout,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Stack,
  Text,
} from "@astryxdesign/core";
import { areaUnitFilter, unitTypeString } from "@/lib/constants";
import type { Unit } from "@/types";
import {
  FormWizard,
  SelectField,
  TextField,
  NumberField as NumField,
} from "@/components/ui";
import { createUnitAction, updateUnitAction } from "./actions";
import { unitSchema, unitDefaults, type UnitFormValues } from "./validations";
import { PointPicker } from "./point-picker";

export function UnitDialog({
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
