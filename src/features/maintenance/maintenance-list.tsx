"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Heading,
  IconButton,
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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DateField, SelectField, TextField } from "@/components/ui";
import { currency } from "@/lib/utils";
import type { MaintenanceRequest, Property } from "@/types";
import {
  createMaintenanceAction,
  deleteMaintenanceAction,
  updateMaintenanceAction,
} from "./actions";
import {
  maintenanceDefaults,
  maintenancePriorityOptions,
  maintenanceSchema,
  maintenanceStatusOptions,
  type MaintenanceFormValues,
} from "./validations";

const priorityVariant: Record<string, BadgeVariant> = {
  low: "blue",
  medium: "purple",
  high: "green",
  urgent: "orange",
};

const statusVariant: Record<string, BadgeVariant> = {
  new: "cyan",
  assigned: "green",
  in_progress: "orange",
  waiting_parts: "yellow",
  completed: "purple",
  closed: "red",
};

function MaintenanceForm({
  request,
  properties,
  assignees,
  isOpen,
  setIsOpen,
}: {
  request: MaintenanceRequest | null;
  properties: Property[];
  assignees: Array<{ id: string; name: string }>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(request);
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema) as Resolver<MaintenanceFormValues>,
    defaultValues: maintenanceDefaults,
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (request) {
      form.reset({
        title: request.title,
        description: request.description ?? "",
        priority: request.priority,
        status: request.status,
        propertyId: request.propertyId,
        assignedTo: request.assignedTo ?? "",
        estimatedCost: request.estimatedCost ?? "",
        actualCost: request.actualCost ?? "",
        completedDate: request.completedDate ?? "",
      });
    } else {
      form.reset(maintenanceDefaults);
    }
  }, [isOpen, request, form]);

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    const result = request
      ? await updateMaintenanceAction(request.id, {
          ...values,
          assignedTo: values.assignedTo || undefined,
          estimatedCost: values.estimatedCost || undefined,
          actualCost: values.actualCost || undefined,
          completedDate: values.completedDate || undefined,
        })
      : await createMaintenanceAction({
          ...values,
          assignedTo: values.assignedTo || undefined,
          estimatedCost: values.estimatedCost || undefined,
          actualCost: values.actualCost || undefined,
          completedDate: values.completedDate || undefined,
        });
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
              title={isEdit ? "Edit request" : "New maintenance request"}
              subtitle="Track work needed on a property."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField form={form} name="title" label="Title" isRequired />
              <TextField
                form={form}
                name="description"
                label="Description"
                isOptional
              />
              <SelectField
                form={form}
                name="propertyId"
                label="Property"
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.title,
                }))}
                isRequired
              />
              <Stack direction="horizontal" gap={2}>
                <SelectField
                  form={form}
                  name="priority"
                  label="Priority"
                  options={maintenancePriorityOptions}
                  isRequired
                />
                <SelectField
                  form={form}
                  name="status"
                  label="Status"
                  options={maintenanceStatusOptions}
                  isRequired
                />
              </Stack>
              <SelectField
                form={form}
                name="assignedTo"
                label="Assign to"
                options={assignees.map((assignee) => ({
                  value: assignee.id,
                  label: assignee.name,
                }))}
                isOptional
              />
              <Stack direction="horizontal" gap={2}>
                <TextField
                  form={form}
                  name="estimatedCost"
                  label="Estimated cost"
                  isOptional
                />
                <TextField
                  form={form}
                  name="actualCost"
                  label="Actual cost"
                  isOptional
                />
              </Stack>
              <DateField
                form={form}
                name="completedDate"
                label="Completed date"
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
                label={isEdit ? "Save changes" : "Create request"}
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

function DeleteRequestDialog({
  request,
  isOpen,
  setIsOpen,
}: {
  request: MaintenanceRequest | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setErrorMessage(null);
  }, [isOpen]);

  const confirm = async () => {
    if (!request) return;
    setErrorMessage(null);
    const result = await deleteMaintenanceAction(request.id);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setIsOpen(false);
    router.refresh();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title="Delete request"
              subtitle={`Permanently remove ${request?.title ?? "this request"}?`}
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <Stack gap={2}>
              <Text type="body">
                This action cannot be undone. The request and all its data will
                be permanently removed.
              </Text>
              {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            </Stack>
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
              <Button label="Delete" variant="destructive" onClick={confirm} />
            </Stack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

export function MaintenanceList({
  requests,
  properties,
  assignees,
}: {
  requests: MaintenanceRequest[];
  properties: Property[];
  assignees: Array<{ id: string; name: string }>;
}) {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceRequest | null>(null);

  const filtered = requests.filter((request) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      request.title.toLowerCase().includes(term) ||
      request.description?.toLowerCase().includes(term) ||
      request.propertyTitle.toLowerCase().includes(term)
    );
  });

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Maintenances</Heading>
          <Text color="secondary">
            Track maintenance requests across properties.
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {requests.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search requests…"
              width="100%"
            />
          ) : null}
          <Button
            icon={<Plus />}
            label="New request"
            variant="primary"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          />
        </Stack>
      </Stack>

      {filtered.length === 0 ? (
        <Text type="body" color="secondary">
          {search
            ? "No requests match your search."
            : "No maintenance requests yet."}
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Assigned to</TableHeaderCell>
              <TableHeaderCell>Est. cost</TableHeaderCell>
              <TableHeaderCell>Actual cost</TableHeaderCell>
              <TableHeaderCell>Completed</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Stack gap={1}>
                    <Text type="body">{request.title}</Text>
                    {request.description ? (
                      <Text type="label" color="secondary">
                        {request.description}
                      </Text>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Text type="body">{request.propertyTitle}</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    label={request.priority}
                    variant={priorityVariant[request.priority] ?? "neutral"}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    label={request.status.replace("_", " ")}
                    variant={statusVariant[request.status] ?? "neutral"}
                  />
                </TableCell>
                <TableCell>
                  <Text type="body">{request.assignedName ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {request.estimatedCost
                      ? currency(request.estimatedCost)
                      : "—"}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {request.actualCost ? currency(request.actualCost) : "—"}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{request.completedDate ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Stack direction="horizontal" gap={2}>
                    <IconButton
                      icon={<Pencil />}
                      label="Edit"
                      size="sm"
                      variant="ghost"
                      tooltip="Edit"
                      onClick={() => {
                        setEditing(request);
                        setIsFormOpen(true);
                      }}
                    />
                    <IconButton
                      icon={<Trash2 />}
                      label="Delete"
                      size="sm"
                      variant="ghost"
                      tooltip="Delete"
                      onClick={() => {
                        setDeleting(request);
                        setIsDeleteOpen(true);
                      }}
                    />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <MaintenanceForm
        request={editing}
        properties={properties}
        assignees={assignees}
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
      />
      <DeleteRequestDialog
        request={deleting}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
      />
    </Stack>
  );
}
