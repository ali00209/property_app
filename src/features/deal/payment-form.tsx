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
import { TextArea } from "@astryxdesign/core";
import { TextField } from "@/components/ui";
import type { Deal } from "@/types";
import { recordDealPaymentAction } from "./actions";
import { paymentSchema, type PaymentFormValues } from "./validations";

const defaults: PaymentFormValues = {
  amount: "",
  paymentMethod: "",
  reference: "",
  notes: "",
}

export function PaymentForm({
  deal,
  isOpen,
  setIsOpen,
}: {
  deal: Deal | null
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormValues>,
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
    const result = await recordDealPaymentAction(deal.id, {
      amount: values.amount,
      paymentMethod: values.paymentMethod || undefined,
      reference: values.reference || undefined,
      notes: values.notes || undefined,
    })
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
              title={`Record Payment${deal ? ` · ${deal.property?.title ?? "Deal"}` : ""}`}
              subtitle="Amount is allocated across the payment schedule and tax."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField
                form={form}
                name="amount"
                label="Amount"
                isRequired
                placeholder="e.g. 1500000"
              />
              <TextField
                form={form}
                name="paymentMethod"
                label="Payment method"
                isOptional
                placeholder="Bank transfer, cash, cheque…"
              />
              <TextField
                form={form}
                name="reference"
                label="Reference"
                isOptional
              />
              <TextArea
                label="Notes"
                value={form.watch("notes") ?? ""}
                onChange={(value: string) => form.setValue("notes", value)}
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
                label="Record Payment"
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