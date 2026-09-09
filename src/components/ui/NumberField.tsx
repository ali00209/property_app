"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Controller } from "react-hook-form";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { fieldStatus } from "./FormField";

export function NumberField<T extends FieldValues>({
  form,
  name,
  label,
  isRequired,
  isOptional,
  ...props
}: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  isRequired?: boolean;
  isOptional?: boolean;
  [key: string]: unknown;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <NumberInput
          {...props}
          label={label}
          value={field.value ?? null}
          onChange={field.onChange}
          isRequired={isRequired}
          isOptional={isOptional}
          status={fieldStatus(fieldState.error)}
        />
      )}
    />
  );
}