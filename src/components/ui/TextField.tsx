"use client";

import { TextInput } from "@astryxdesign/core/TextInput";
import { Controller } from "react-hook-form";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { fieldStatus } from "./FormField";

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  placeholder,
  isRequired,
  isOptional,
  description,
  ...props
}: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  isRequired?: boolean;
  isOptional?: boolean;
  description?: string;
  [key: string]: unknown;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          {...props}
          label={label}
          type={type}
          value={String(field.value ?? "")}
          onChange={(value) => field.onChange(value)}
          onBlur={field.onBlur}
          placeholder={placeholder}
          isRequired={isRequired}
          isOptional={isOptional}
          description={description}
          status={fieldStatus(fieldState.error)}
        />
      )}
    />
  );
}