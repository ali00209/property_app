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
  TextArea,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { DateField, SelectField, TextField } from "@/components/ui";
import { currency } from "@/lib/utils";
import { paymentMethodFilter } from "@/lib/constants";
import type { DealTaxCandidates, DealType, PolicyMeta } from "@/types";
import { createDealAction } from "./actions";
import { dealFormSchema, type DealFormValues } from "./validations";

const dealTypeOptions = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "fixed_lease", label: "Fixed Lease" },
  { value: "periodic_rent", label: "Periodic Rent" },
  { value: "installment_purchase", label: "Installment Purchase" },
];

const frequencyOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const periodMonths = (frequency: string | undefined) =>
  frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;

const inEffect = (policy: PolicyMeta, today: string) =>
  (!policy.effectiveStart || policy.effectiveStart <= today) &&
  (!policy.effectiveEnd || policy.effectiveEnd >= today);

const defaults: DealFormValues = {
  propertyId: "",
  type: "cash_sale",
  counterpartyId: "",
  currency: "PKR",
  frequency: "monthly",
  taxPolicyId: "",
  downPaymentAmount: "",
  installmentAmount: "",
  installmentCount: "",
};

export function DealForm({
  isOpen,
  setIsOpen,
  propertyOptions,
  userOptions,
  taxCandidates,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  propertyOptions: Array<{ value: string; label: string }>;
  userOptions: Array<{ value: string; label: string }>;
  taxCandidates: DealTaxCandidates;
}) {
  const router = useRouter();
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema) as Resolver<DealFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(defaults);
  }, [isOpen, form]);

  const dealType = form.watch("type") as DealType;
  const propertyId = form.watch("propertyId");

  const availableTaxPolicies = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const policies = [
      ...taxCandidates.fallback,
      ...(taxCandidates.byProperty[propertyId] ?? []),
    ]
      .filter((policy) => policy.appliesTo.includes(dealType))
      .filter((policy) => inEffect(policy, today))
      .filter(
        (policy, index, all) =>
          all.findIndex((candidate) => candidate.id === policy.id) === index,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      { value: "", label: "No tax" },
      ...policies.map((policy) => ({
        value: policy.id,
        label:
          policy.kind === "percentage"
            ? `${policy.name} · ${policy.value}%`
            : `${policy.name} · ${currency(Number(policy.value))}`,
      })),
    ];
  }, [dealType, propertyId, taxCandidates]);

  useEffect(() => {
    const selectedPolicyId = form.getValues("taxPolicyId");
    if (
      selectedPolicyId &&
      !availableTaxPolicies.some((policy) => policy.value === selectedPolicyId)
    ) {
      form.setValue("taxPolicyId", "");
    }
  }, [availableTaxPolicies, form]);

  const submit = form.handleSubmit(async (values) => {
    const result = await createDealAction({
      ...values,
      totalAmount: values.totalAmount || undefined,
      paymentMethod: values.paymentMethod || undefined,
      startsOn: values.startsOn || undefined,
      endsOn: values.endsOn || undefined,
      dueOn: values.dueOn || undefined,
      rentAmount: values.rentAmount || undefined,
      depositAmount: values.depositAmount || undefined,
      downPaymentAmount: values.downPaymentAmount || undefined,
      installmentAmount: values.installmentAmount || undefined,
      installmentCount: values.installmentCount || undefined,
      notes: values.notes || undefined,
      taxPolicyId: values.taxPolicyId || undefined,
    });
    if (!result.ok) {
      return;
    }
    setIsOpen(false);
    router.refresh();
  });

  const isFixedLease = dealType === "fixed_lease";
  const isPeriodicRent = dealType === "periodic_rent";
  const isLeaseLike = isFixedLease || isPeriodicRent;

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const selectedPolicy = [
      ...taxCandidates.fallback,
      ...(taxCandidates.byProperty[propertyId] ?? []),
    ].find(
      (policy) =>
        policy.id === form.watch("taxPolicyId") &&
        policy.appliesTo.includes(dealType) &&
        inEffect(policy, today),
    );

    let base: number | null = null;
    if (dealType === "cash_sale") {
      const amount = Number(form.watch("totalAmount") ?? 0);
      base = amount > 0 ? amount : null;
    } else if (dealType === "installment_purchase") {
      const down = Number(form.watch("downPaymentAmount") ?? 0);
      const installment = Number(form.watch("installmentAmount") ?? 0);
      const count = Number(form.watch("installmentCount") ?? 0);
      base = down + installment * count;
    } else if (dealType === "fixed_lease") {
      const rent = Number(form.watch("rentAmount") ?? 0);
      const startsOn = form.watch("startsOn");
      const endsOn = form.watch("endsOn");
      if (!rent || !startsOn || !endsOn) base = null;
      else {
        const start = new Date(`${startsOn}T00:00:00`);
        const end = new Date(`${endsOn}T00:00:00`);
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        base =
          rent *
          Math.max(
            1,
            Math.ceil(
              Math.max(0, months) / periodMonths(form.watch("frequency")),
            ),
          );
      }
    } else if (dealType === "periodic_rent") {
      const rent = Number(form.watch("rentAmount") ?? 0);
      base = rent > 0 ? rent : null;
    }

    const breakdown = selectedPolicy
      ? [
          {
            policy: selectedPolicy,
            taxAmount:
              selectedPolicy.kind === "percentage"
                ? Math.round((base ?? 0) * Number(selectedPolicy.value)) / 100
                : Number(selectedPolicy.value),
          },
        ]
      : [];
    const totalTax = breakdown.reduce((sum, item) => sum + item.taxAmount, 0);
    return { base, breakdown, totalTax };
  }, [taxCandidates, propertyId, dealType, form]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      purpose="form"
      width={"40%"}
    >
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title="New Deal"
              subtitle="Pick a property, deal type, and counterparty"
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <SelectField
                form={form}
                name="type"
                label="Deal type"
                options={dealTypeOptions}
                isRequired
              />
              <SelectField
                form={form}
                name="propertyId"
                label="Property"
                options={propertyOptions}
                isRequired
              />
              <SelectField
                form={form}
                name="counterpartyId"
                label="Counterparty"
                options={userOptions}
                isRequired
              />
              <SelectField
                form={form}
                name="taxPolicyId"
                label="Tax policy"
                options={availableTaxPolicies}
                isOptional
              />

              {dealType === "cash_sale" ? (
                <>
                  <TextField
                    form={form}
                    name="totalAmount"
                    label="Total amount"
                    isRequired
                    placeholder="e.g. 5000000"
                  />
                  <SelectField
                    form={form}
                    name="paymentMethod"
                    label="Payment method"
                    options={paymentMethodFilter}
                    isOptional
                  />
                  <DateField
                    form={form}
                    name="dueOn"
                    label="Due date"
                    isOptional
                  />
                </>
              ) : null}

              {isLeaseLike ? (
                <>
                  <DateField
                    form={form}
                    name="startsOn"
                    label="Start date"
                    isRequired
                  />
                  {isFixedLease ? (
                    <DateField
                      form={form}
                      name="endsOn"
                      label="End date"
                      isRequired
                    />
                  ) : null}
                  <TextField
                    form={form}
                    name="rentAmount"
                    label="Rent amount"
                    isRequired
                  />
                  <TextField
                    form={form}
                    name="depositAmount"
                    label="Deposit amount"
                    isOptional
                  />
                  <SelectField
                    form={form}
                    name="frequency"
                    label="Frequency"
                    options={frequencyOptions}
                    isRequired
                  />
                </>
              ) : null}

              {dealType === "installment_purchase" ? (
                <>
                  <Stack direction="horizontal" gap={3}>
                    <TextField
                      form={form}
                      name="downPaymentAmount"
                      label="Down payment"
                      isRequired
                      placeholder="e.g. 1000000"
                    />
                    <TextField
                      form={form}
                      name="installmentAmount"
                      label="Installment amount"
                      isRequired
                      placeholder="e.g. 250000"
                    />
                  </Stack>
                  <Stack direction="horizontal" gap={3}>
                    <TextField
                      form={form}
                      name="installmentCount"
                      label="Number of installments"
                      isRequired
                      placeholder="e.g. 16"
                    />
                    <SelectField
                      form={form}
                      name="frequency"
                      label="Frequency"
                      options={frequencyOptions}
                      isRequired
                    />
                  </Stack>
                </>
              ) : null}

              {summary.base !== null ? (
                <Stack gap={2}>
                  <Text type="label">
                    Financing summary
                    {summary.base !== null && summary.breakdown.length === 0
                      ? " · no tax applies"
                      : ""}
                  </Text>
                  {dealType === "installment_purchase" ? (
                    <Text color="secondary">
                      {currency(form.watch("downPaymentAmount") ?? "0")} down +{" "}
                      {form.watch("installmentCount") || "0"} ×{" "}
                      {currency(form.watch("installmentAmount") ?? "0")} ={" "}
                      {currency(summary.base)}
                    </Text>
                  ) : (
                    <Text color="secondary">
                      Contract value: {currency(summary.base)}
                    </Text>
                  )}
                  {summary.breakdown.map((item) => (
                    <Text key={item.policy.id} color="secondary">
                      {item.policy.name} ·
                      {item.policy.kind === "percentage"
                        ? ` ${item.policy.value}%`
                        : " fixed"}{" "}
                      — {currency(item.taxAmount)}
                    </Text>
                  ))}
                  <Text>
                    Total payable: {currency(summary.base + summary.totalTax)}
                  </Text>
                </Stack>
              ) : null}

              <TextArea
                label="Notes"
                value={form.watch("notes") ?? ""}
                onChange={(value: string) => form.setValue("notes", value)}
                isOptional
              />
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
                label="Create Deal"
                variant="primary"
                onClick={() => submit()}
              />
            </Stack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
