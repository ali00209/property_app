"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Selector,
  Stack,
  Switch,
  Text,
  type BadgeVariant,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { TextField } from "@/components/ui";
import { currency } from "@/lib/utils";
import type {
  InstallmentAssignment,
  InstallmentPlan,
  TaxPolicy,
} from "@/types";
import { assignPropertyAction } from "@/features/installment/actions";
import { setPropertyTaxAssignmentAction } from "@/features/tax-policy/actions";
import { assignmentSchema } from "@/features/installment/validations";
import type { AssignmentFormValues } from "@/features/installment/validations";

const statusVariant: Record<string, BadgeVariant> = {
  published: "green",
  draft: "yellow",
  archived: "neutral",
}

export function FinancingManager({
  propertyId,
  plans,
  assignments,
  taxPolicies,
  taxAssignmentIds,
}: {
  propertyId: string
  plans: InstallmentPlan[]
  assignments: InstallmentAssignment[]
  taxPolicies: TaxPolicy[]
  taxAssignmentIds: string[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [excludingTaxIds, setExcludingTaxIds] = useState<string[]>([])
  const [includingTaxIds, setIncludingTaxIds] = useState<string[]>([])

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema) as Resolver<AssignmentFormValues>,
    defaultValues: {
      propertyId,
      price: "",
      downPaymentAmount: "",
      installmentAmount: "",
    },
    mode: "onBlur",
  })

  const [templateId, setTemplateId] = useState("")

  const submit = form.handleSubmit(async (values) => {
    if (!templateId) return
    setErrorMessage(null)
    const result = await assignPropertyAction(templateId, {
      propertyId,
      price: values.price,
      downPaymentAmount: values.downPaymentAmount || undefined,
      installmentAmount: values.installmentAmount || undefined,
    })
    if (!result.ok) {
      setErrorMessage(result.error.message)
      return
    }
    setIsOpen(false)
    setTemplateId("")
    form.reset({ propertyId, price: "", downPaymentAmount: "", installmentAmount: "" })
    router.refresh()
  })

  const onToggleTax = async (policyId: string, checked: boolean) => {
    setErrorMessage(null)
    if (checked) {
      setIncludingTaxIds((prev) =>
        prev.includes(policyId) ? prev : [...prev, policyId],
      )
    } else {
      setExcludingTaxIds((prev) =>
        prev.includes(policyId) ? prev : [...prev, policyId],
      )
    }
    const result = await setPropertyTaxAssignmentAction(
      propertyId,
      policyId,
      checked,
    )
    if (!result.ok) {
      setErrorMessage(result.error.message)
      setIncludingTaxIds((prev) => prev.filter((id) => id !== policyId))
      setExcludingTaxIds((prev) => prev.filter((id) => id !== policyId))
      router.refresh()
      return
    }
    router.refresh()
  }

  const optimisticTaxIds = [...taxAssignmentIds]
    .filter((id) => !excludingTaxIds.includes(id))
    .concat(includingTaxIds)

  const assignedPlanIds = new Set(
    assignments.map((assignment) => assignment.templateId),
  )

  return (
    <>
      <Stack gap={3}>
        <Stack direction="horizontal" hAlign="between" vAlign="center">
          <Text type="label">Installment plans</Text>
          <Button
            icon={<Plus />}
            label="Add plan"
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(true)}
          />
        </Stack>
        {assignments.length === 0 ? (
          <Text type="body" color="secondary">
            No installment plans assigned to this property yet.
          </Text>
        ) : (
          <Stack gap={2}>
            {assignments.map((assignment) => (
              <Stack key={assignment.id} direction="horizontal" gap={3} vAlign="center">
                <Stack gap={0}>
                  <Text type="body">{assignment.planName}</Text>
<Text type="body" color="secondary">
                {currency(assignment.price)} ·{" "}
                {currency(assignment.downPaymentAmount)} down ·{" "}
                {currency(assignment.installmentAmount)}/mo
              </Text>
                </Stack>
                <Badge
                  label={assignment.status}
                  variant={statusVariant[assignment.status] ?? "neutral"}
                />
              </Stack>
            ))}
          </Stack>
        )}

        <Text type="label">Tax policies</Text>
        {taxPolicies.length === 0 ? (
          <Text type="body" color="secondary">
            No active tax policies. Create policies under Tax Policies.
          </Text>
        ) : (
          <Stack gap={2}>
            {taxPolicies.map((policy) => (
              <Switch
                key={policy.id}
                label={policy.name}
                description={
                  policy.kind === "percentage"
                    ? `${policy.value}% of base · ${policy.appliesTo.join(", ")}`
                    : `${currency(Number(policy.value))} · ${policy.appliesTo.join(", ")}`
                }
                value={optimisticTaxIds.includes(policy.id)}
                changeAction={(checked) => onToggleTax(policy.id, checked)}
              />
            ))}
          </Stack>
        )}
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
      </Stack>

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
        <Layout
          header={
            <LayoutHeader>
              <DialogHeader
                title="Add installment plan"
                subtitle="Leave amounts empty to auto-calculate from the template."
              />
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <FormLayout>
                <Selector
                  label="Plan template"
                  isRequired
                  placeholder="Select plan"
                  value={templateId}
                  onChange={setTemplateId}
                  options={plans
                    .filter(
                      (plan) =>
                        plan.status !== "archived" &&
                        !assignedPlanIds.has(plan.id),
                    )
                    .map((plan) => ({
                      value: plan.id,
                      label: plan.name,
                    }))}
                />
                <TextField
                  form={form}
                  name="price"
                  label="Price"
                  isRequired
                  placeholder="e.g. 5000000"
                />
                <TextField
                  form={form}
                  name="downPaymentAmount"
                  label="Down payment (empty = template %)"
                  isOptional
                />
                <TextField
                  form={form}
                  name="installmentAmount"
                  label="Installment (empty = auto)"
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
                  label="Assign plan"
                  variant="primary"
                  onClick={() => submit()}
                />
              </Stack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  )
}