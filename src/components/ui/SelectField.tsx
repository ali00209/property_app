"use client";

import { Selector } from "@astryxdesign/core/Selector";
import type { SelectorOptionType } from "@astryxdesign/core/Selector";
import { Controller } from "react-hook-form";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { fieldStatus } from "./FormField";

export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  options,
  isRequired,
  isOptional,
  placeholder,
  ...props
}: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  options: SelectorOptionType[];
  isRequired?: boolean;
  isOptional?: boolean;
  placeholder?: string;
  [key: string]: unknown;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Selector
          {...props}
          label={label}
          options={options}
          value={String(field.value ?? "")}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isRequired={isRequired}
          isOptional={isOptional}
          placeholder={placeholder}
          status={fieldStatus(fieldState.error)}
        />
      )}
    />
  );
}