"use client";

import {
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Stack,
  Switch,
  Text,
  TextArea,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { DateField, SelectField, TextField } from "@/components/ui";
import { taxAppliesToOptions } from "@/lib/constants";
import type { DealType, TaxPolicy } from "@/types";
import { createTaxPolicyAction, updateTaxPolicyAction } from "./actions";
import {
  taxPolicySchema,
  defaults,
  type TaxPolicyFormValues,
} from "./validations";

export function TaxPolicyForm({
  policy,
  isOpen,
  setIsOpen,
}: {
  policy?: TaxPolicy | null
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<TaxPolicyFormValues>({
    resolver: zodResolver(taxPolicySchema) as Resolver<TaxPolicyFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isEdit = Boolean(policy)

  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    if (policy) {
      form.reset({
        name: policy.name,
        kind: policy.kind,
        value: String(policy.value),
        appliesTo: policy.appliesTo,
        active: policy.active,
        effectiveStart: policy.effectiveStart ?? undefined,
        effectiveEnd: policy.effectiveEnd ?? undefined,
        code: policy.code ?? "",
        authority: policy.authority ?? "",
        description: policy.description ?? "",
        notes: policy.notes ?? "",
      })
    } else {
      form.reset(defaults)
    }
  }, [isOpen, policy, form])

  const appliesTo = form.watch("appliesTo")
  const toggleAppliesTo = (value: DealType) => {
    const next = appliesTo.includes(value)
      ? appliesTo.filter((item) => item !== value)
      : [...appliesTo, value]
    form.setValue("appliesTo", next, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }
  const toggleChip = (value: DealType) => appliesTo.includes(value)

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null)
    const payload = {
      ...values,
      effectiveStart: values.effectiveStart || undefined,
      effectiveEnd: values.effectiveEnd || undefined,
      code: values.code || undefined,
      authority: values.authority || undefined,
      description: values.description || undefined,
      notes: values.notes || undefined,
    }
    const result = policy
      ? await updateTaxPolicyAction(policy.id, payload)
      : await createTaxPolicyAction(payload)
    if (!result.ok) {
      setErrorMessage(result.error.message)
      return
    }
    setIsOpen(false)
    router.refresh()
  })

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={isEdit ? "Edit tax policy" : "New tax policy"}
              subtitle="Rules are applied to new sale agreements when the deal is created."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField
                form={form}
                name="name"
                label="Name"
                isRequired
                placeholder="e.g. Capital Value Tax"
              />
              <TextField
                form={form}
                name="code"
                label="Code"
                isOptional
                placeholder="e.g. CVT-2026"
              />
              <SelectField
                form={form}
                name="kind"
                label="Rule"
                options={[
                  { value: "percentage", label: "Percentage of base" },
                  { value: "fixed_amount", label: "Fixed amount" },
                ]}
                isRequired
              />
              <TextField
                form={form}
                name="value"
                label={form.watch("kind") === "percentage" ? "Percent %" : "Amount"}
                isRequired
                placeholder="e.g. 3"
              />
              <Stack direction="horizontal" hAlign="start" vAlign="end" gap={3}>
                <Text type="label">Applies to</Text>
                {taxAppliesToOptions.map((option) => (
                  <Button
                    key={option.value}
                    label={option.label}
                    size="sm"
                    variant={toggleChip(option.value as DealType) ? "primary" : "ghost"}
                    onClick={() =>
                      toggleAppliesTo(option.value as DealType)
                    }
                  />
                ))}
              </Stack>
              <Switch
                label="Active"
                value={form.watch("active") ?? true}
                onChange={(checked) => form.setValue("active", checked)}
              />
              <DateField
                form={form}
                name="effectiveStart"
                label="Effective start"
                isOptional
              />
              <DateField
                form={form}
                name="effectiveEnd"
                label="Effective end"
                isOptional
              />
              <TextField
                form={form}
                name="authority"
                label="Authority"
                isOptional
              />
              <TextArea
                label="Description"
                value={form.watch("description") ?? ""}
                onChange={(value) => form.setValue("description", value)}
                isOptional
              />
              {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <Stack direction="horizontal" hAlign="between">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              />
              <Button
                label={isEdit ? "Save changes" : "Create policy"}
                variant="primary"
                onClick={() => submit()}
              />
            </Stack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}