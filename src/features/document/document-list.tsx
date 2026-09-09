"use client";

import {
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
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { FileField, SelectField, TextField } from "@/components/ui";
import type { Property } from "@/types";
import { createDocumentAction, deleteDocumentAction } from "./actions";
import {
  documentDefaults,
  documentSchema,
  type DocumentFormValues,
} from "./validations";
import type { PropertyDocument } from "./db-queries";

function fmtSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1000)} KB`;
}

function UploadForm({
  properties,
  isOpen,
  setIsOpen,
}: {
  properties: Property[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema) as Resolver<DocumentFormValues>,
    defaultValues: documentDefaults,
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedFile = form.watch("file");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    form.reset({ entityId: "", name: "", file: undefined as unknown as File });
  }, [isOpen, form]);

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("entityId", values.entityId);
    formData.set("name", values.name);
    formData.set("file", values.file);
    formData.set("fileSize", String(values.file.size));
    const result = await createDocumentAction(formData);
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
              title="Upload document"
              subtitle="Store a file against a property."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <FileField
                form={form}
                name="file"
                label="File"
                isRequired
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg"
              />
              {selectedFile instanceof File ? (
                <Text type="label" color="secondary">
                  {selectedFile.type} · {fmtSize(selectedFile.size)}
                </Text>
              ) : null}
              <TextField
                form={form}
                name="name"
                label="Document name"
                isRequired
              />
              <SelectField
                form={form}
                name="entityId"
                label="Property"
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.title,
                }))}
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
                label="Upload"
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

function DeleteDocumentDialog({
  document,
  isOpen,
  setIsOpen,
}: {
  document: PropertyDocument | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setErrorMessage(null);
  }, [isOpen]);

  const confirm = async () => {
    if (!document) return;
    setErrorMessage(null);
    const result = await deleteDocumentAction(document.id);
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
              title="Delete document"
              subtitle={`Permanently remove ${document?.name ?? "this file"}?`}
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <Stack gap={2}>
              <Text type="body">
                This action cannot be undone. The file and its record will be
                permanently removed.
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

export function DocumentList({
  documents,
  properties,
}: {
  documents: PropertyDocument[];
  properties: Property[];
}) {
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<PropertyDocument | null>(null);

  const filtered = documents.filter((document) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      document.name.toLowerCase().includes(term) ||
      document.propertyTitle.toLowerCase().includes(term) ||
      document.fileType.toLowerCase().includes(term)
    );
  });

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Documents</Heading>
          <Text color="secondary">All uploaded files across properties. </Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {documents.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search documents…"
              width="100%"
            />
          ) : null}
          <Button
            icon={<Plus />}
            label="Upload"
            variant="primary"
            onClick={() => setIsUploadOpen(true)}
          />
        </Stack>
      </Stack>

      {filtered.length === 0 ? (
        <Stack direction="horizontal" gap={2} vAlign="center">
          <FileText />
          <Text type="body" color="secondary">
            {search
              ? "No documents match your search."
              : "No documents uploaded yet."}
          </Text>
        </Stack>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Size</TableHeaderCell>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>File</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <Text type="body">{document.name}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{document.fileType || "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{fmtSize(document.fileSize)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{document.propertyTitle}</Text>
                </TableCell>
                <TableCell>
                  {document.fileUrl ? (
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Open
                    </a>
                  ) : (
                    <Text type="body">—</Text>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    icon={<Trash2 />}
                    label="Delete"
                    size="sm"
                    variant="ghost"
                    tooltip="Delete"
                    onClick={() => {
                      setDeleting(document);
                      setIsDeleteOpen(true);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <UploadForm
        properties={properties}
        isOpen={isUploadOpen}
        setIsOpen={setIsUploadOpen}
      />
      <DeleteDocumentDialog
        document={deleting}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
      />
    </Stack>
  );
}
