"use client";

import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import type { ReactNode } from "react";

export type FieldError = {
  message?: string;
};

export function fieldStatus(error?: FieldError) {
  return error?.message
    ? { type: "error" as const, message: error.message }
    : undefined;
}

export function FormField({
  children,
  error,
  id,
}: {
  children: ReactNode;
  error?: FieldError;
  id?: string;
}) {
  return (
    <>
      {children}
      {error?.message ? (
        <FieldStatus
          id={id ? `${id}-error` : undefined}
          type="error"
          message={error.message}
        />
      ) : null}
    </>
  );
}