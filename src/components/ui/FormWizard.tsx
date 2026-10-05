"use client";

import { Button, FormLayout, Stack, Step, Stepper } from "@astryxdesign/core";
import type { ReactNode } from "react";

export function FormWizard({
  step,
  steps,
  children,
  onBack,
  onNext,
  onSubmit,
  canSubmit = false,
  isSubmitting = false,
}: {
  step: number;
  steps: string[];
  children?: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canSubmit?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <FormLayout>
      <Stepper activeStep={step} label="Form progress">
        {steps.map((label, index) => (
          <Step key={label} step={index} label={label} />
        ))}
      </Stepper>
      {children}
      <Stack direction="horizontal" justify="end" gap={2}>
        {step > 0 ? (
          <Button label="Back" onClick={onBack} isDisabled={isSubmitting} />
        ) : null}
        {canSubmit ? (
          <Button
            label={isSubmitting ? "Saving…" : "Save"}
            variant="primary"
            onClick={onSubmit}
            isDisabled={isSubmitting}
          />
        ) : (
          <Button
            label="Next"
            variant="primary"
            onClick={onNext}
            isDisabled={isSubmitting}
          />
        )}
      </Stack>
    </FormLayout>
  );
}