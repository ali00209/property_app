"use client";

import { DateInput } from "@astryxdesign/core/DateInput";
import { Controller } from "react-hook-form";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { fieldStatus } from "./FormField";

export function DateField<T extends FieldValues>({
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
        <DateInput
          {...props}
          label={label}
          value={(field.value ?? "") as never}
          onChange={field.onChange}
          isRequired={isRequired}
          isOptional={isOptional}
          status={fieldStatus(fieldState.error)}
        />
      )}
    />
  );
}