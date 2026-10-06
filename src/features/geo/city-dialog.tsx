"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Stack, Text } from "@astryxdesign/core";
import { provinceFilter } from "@/lib/constants";
import type { City } from "@/types";
import { FormDialog, SelectField, TextField } from "@/components/ui";
import {
  createCityAction,
  updateCityAction,
} from "./actions";
import { citySchema, cityDefaults, type CityFormValues } from "./validations";

export function CityDialog({
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
