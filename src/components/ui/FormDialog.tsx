"use client";

import {
  Button,
  Dialog,
  DialogHeader,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Stack,
} from "@astryxdesign/core";
import type { ReactNode } from "react";

export function FormDialog({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  children,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  width = 640,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  width?: number | string;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={width}
    >
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader title={title} subtitle={subtitle} />
          </LayoutHeader>
        }
        content={<LayoutContent>{children}</LayoutContent>}
        footer={
          <LayoutFooter>
            <Stack direction="horizontal" justify="end" gap={2}>
              <Button
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={isSubmitting ? "Saving…" : submitLabel}
                variant="primary"
                type="submit"
                isDisabled={isSubmitting}
                onClick={onSubmit}
              />
            </Stack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

export { FormDialog as default };