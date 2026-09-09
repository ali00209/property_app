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
  Text,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui";
import type { Deal } from "@/types";
import { settleDealAction } from "./actions";
import { settlementSchema, type SettlementFormValues } from "./validations";

const defaults: SettlementFormValues = {
  reason: "",
  refundAmount: "",
}

export function SettlementForm({
  deal,
  kind,
  isOpen,
  setIsOpen,
}: {
  deal: Deal | null
  kind: "cancel" | "terminate"
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema) as Resolver<SettlementFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    form.reset(defaults)
  }, [isOpen, form])

  const submit = form.handleSubmit(async (values) => {
    if (!deal) return
    setErrorMessage(null)
    const result = await settleDealAction(
      deal.id,
      kind === "cancel" ? "cancelled" : "terminated",
      {
        reason: values.reason,
        refundAmount: values.refundAmount || undefined,
      },
    )
    if (!result.ok) {
      setErrorMessage(result.error.message)
      return
    }
    setIsOpen(false)
    router.refresh()
  })

  const isCancel = kind === "cancel"

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={isCancel ? "Cancel Deal" : "Terminate Deal"}
              subtitle={
                isCancel
                  ? "Cancelling returns the property to available and refunds collected amounts."
                  : "Termination is restricted to admins, managers, and owners."
              }
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField
                form={form}
                name="reason"
                label="Reason"
                isRequired
                placeholder="Why is this deal being closed?"
              />
              <TextField
                form={form}
                name="refundAmount"
                label="Refund amount"
                isOptional
                placeholder="Leave empty to refund all collected"
              />
              {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <Stack direction="horizontal" hAlign="between">
              <Button
                label="Keep Deal"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              />
              <Button
                label={isCancel ? "Cancel Deal" : "Terminate Deal"}
                variant="destructive"
                onClick={() => submit()}
              />
            </Stack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}