"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Stack, Text } from "@astryxdesign/core";
import type { SocietySector } from "@/types";
import { FormDialog, SelectField, TextField } from "@/components/ui";
import { createSectorAction, updateSectorAction } from "./actions";
import { sectorSchema, type SectorFormValues } from "./validations";

export function SectorDialog({
  isOpen,
  onClose,
  editing,
  societyId,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: SocietySector | null;
  societyId: string;
}) {
  const router = useRouter();
  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema) as Resolver<SectorFormValues>,
    defaultValues: { societyId, name: "" },
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      editing ? { societyId, name: editing.name } : { societyId, name: "" },
    );
    setErrorMessage(null);
  }, [isOpen, editing, societyId, form]);

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = editing
      ? await updateSectorAction(editing.id, values)
      : await createSectorAction(values);
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
      title={editing ? "Edit sector" : "New sector"}
      subtitle="Sectors (phases, blocks) group units under a society."
      onSubmit={() => submit()}
      isSubmitting={isSubmitting}
      submitLabel={editing ? "Save changes" : "Create sector"}
    >
      <Stack gap={3}>
        <TextField
          form={form}
          name="name"
          label="Name"
          isRequired
          placeholder="e.g. Block C"
        />
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>
    </FormDialog>
  );
}
