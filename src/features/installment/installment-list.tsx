"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Heading,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  type BadgeVariant,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { SelectField, TextField } from "@/components/ui";
import type { InstallmentPlan } from "@/types";
import {
  archiveInstallmentPlanAction,
  createInstallmentPlanAction,
  publishInstallmentPlanAction,
  updateInstallmentPlanAction,
} from "./actions";
import {
  installmentPlanSchema,
  planDefaults,
  type InstallmentPlanFormValues,
} from "./validations";

const frequencyLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

const statusVariant: Record<InstallmentPlan["status"], BadgeVariant> = {
  draft: "yellow",
  published: "green",
  archived: "neutral",
};

function PlanForm({
  plan,
  isOpen,
  setIsOpen,
}: {
  plan: InstallmentPlan | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const form = useForm<InstallmentPlanFormValues>({
    resolver: zodResolver(
      installmentPlanSchema,
    ) as Resolver<InstallmentPlanFormValues>,
    defaultValues: planDefaults,
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = Boolean(plan);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (plan) {
      form.reset({
        name: plan.name,
        description: plan.description ?? "",
        frequency: plan.frequency,
        termMonths: String(plan.termMonths),
        downPaymentPercent: String(plan.downPaymentPercent),
        interestRate: String(plan.interestRate),
      });
    } else {
      form.reset(planDefaults);
    }
  }, [isOpen, plan, form]);

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    const result = plan
      ? await updateInstallmentPlanAction(plan.id, values)
      : await createInstallmentPlanAction(values);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setIsOpen(false);
    router.refresh();
  });

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form">
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={isEdit ? "Edit plan" : "New installment plan"}
              subtitle="Templates define frequency, term, down payment, and markup."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField form={form} name="name" label="Name" isRequired />
              <TextField
                form={form}
                name="description"
                label="Description"
                isOptional
              />
              <SelectField
                form={form}
                name="frequency"
                label="Frequency"
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "annually", label: "Annually" },
                ]}
                isRequired
              />
              <TextField
                form={form}
                name="termMonths"
                label="Term (months)"
                isRequired
              />
              <TextField
                form={form}
                name="downPaymentPercent"
                label="Down payment %"
                isRequired
              />
              <TextField
                form={form}
                name="interestRate"
                label="Markup %"
                isRequired
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
                label={isEdit ? "Save changes" : "Create plan"}
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

export function InstallmentList({ plans }: { plans: InstallmentPlan[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredPlans = plans.filter((plan) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      plan.name.toLowerCase().includes(term) ||
      plan.description?.toLowerCase().includes(term)
    );
  });

  const run = async (
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => {
    setErrorMessage(null);
    const result = await action();
    if (!result.ok) {
      setErrorMessage(result.error?.message ?? "Something went wrong.");
    }
    router.refresh();
  };

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Installment plans</Heading>
          <Text color="secondary">
            Templates define frequency, term, down payment, and markup.
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {plans.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search plans…"
              width="100%"
            />
          ) : null}
          <Button
            icon={<Plus />}
            label="New plan"
            variant="primary"
            onClick={() => {
              setEditingPlan(null);
              setIsPlanOpen(true);
            }}
          />
        </Stack>
      </Stack>

      {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}

      {filteredPlans.length === 0 ? (
        <Text type="body" color="secondary">
          {search
            ? "No plans match your search."
            : "No installment plan templates yet."}
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Plan</TableHeaderCell>
              <TableHeaderCell>Frequency</TableHeaderCell>
              <TableHeaderCell>Term</TableHeaderCell>
              <TableHeaderCell>Down payment</TableHeaderCell>
              <TableHeaderCell>Markup</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Stack gap={1}>
                    <Text type="body">{plan.name}</Text>
                    {plan.description ? (
                      <Text type="label" color="secondary">
                        {plan.description}
                      </Text>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Text type="body">{frequencyLabels[plan.frequency]}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{plan.termMonths} mo</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{Number(plan.downPaymentPercent)}%</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{Number(plan.interestRate)}%</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    label={plan.status}
                    variant={statusVariant[plan.status]}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="horizontal" gap={2}>
                    {plan.status === "draft" ? (
                      <Button
                        label="Publish"
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          run(() => publishInstallmentPlanAction(plan.id))
                        }
                      />
                    ) : null}
                    <Button
                      label="Edit"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsPlanOpen(true);
                      }}
                    />
                    {plan.status !== "archived" ? (
                      <Button
                        label="Archive"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(() => archiveInstallmentPlanAction(plan.id))
                        }
                      />
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PlanForm
        plan={editingPlan}
        isOpen={isPlanOpen}
        setIsOpen={setIsPlanOpen}
      />
    </Stack>
  );
}
