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
import { SelectField, TextField } from "@/components/ui";
import type { User } from "@/types";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "./actions";
import {
  createUserDefaults,
  createUserSchema,
  updateUserSchema,
  userRoleOptions,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "./validations";

const roleVariant: Record<string, BadgeVariant> = {
  admin: "green",
  accountant: "blue",
  client: "purple",
  maintenance_staff: "orange",
  owner: "red",
  property_manager: "yellow",
  tenant: "blue",
};

function UserForm({
  user,
  isOpen,
  setIsOpen,
}: {
  user: User | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const form = useForm<CreateUserFormValues & { password?: string }>({
    resolver: zodResolver(
      isEdit ? updateUserSchema : createUserSchema,
    ) as Resolver<CreateUserFormValues & { password?: string }>,
    defaultValues: createUserDefaults,
    mode: "onBlur",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (user) {
      form.reset({
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? "",
        role: user.role as CreateUserFormValues["role"],
        password: "",
      });
    } else {
      form.reset(createUserDefaults);
    }
  }, [isOpen, user, form]);

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    const result = user
      ? await updateUserAction(user.id, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          role: values.role,
          password: values.password || undefined,
        })
      : await createUserAction({
          ...values,
          phone: values.phone ?? undefined,
        } as CreateUserFormValues);
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
              title={isEdit ? "Edit user" : "New user"}
              subtitle="Manage account details and platform role."
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <FormLayout>
              <TextField form={form} name="name" label="Name" isRequired />
              <TextField
                form={form}
                name="email"
                label="Email"
                type="email"
                isOptional
              />
              <TextField form={form} name="phone" label="Phone" isOptional />
              <SelectField
                form={form}
                name="role"
                label="Role"
                options={userRoleOptions}
                isRequired
              />
              <TextField
                form={form}
                name="password"
                label={isEdit ? "Password (blank keeps current)" : "Password"}
                type="password"
                isRequired={!isEdit}
                isOptional={isEdit}
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
                label={isEdit ? "Save changes" : "Create user"}
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

function DeleteUserDialog({
  user,
  isOpen,
  setIsOpen,
}: {
  user: User | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setErrorMessage(null);
  }, [isOpen]);

  const confirm = async () => {
    if (!user) return;
    setErrorMessage(null);
    const result = await deleteUserAction(user.id);
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
              title="Delete user"
              subtitle={`Permanently remove ${user?.name ?? "this user"}?`}
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <Stack gap={2}>
              <Text type="body">
                This action cannot be undone. The account and its data will be
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

export function UserList({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const filtered = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      user.name.toLowerCase().includes(term) ||
      (user.email?.toLowerCase().includes(term) ?? false) ||
      user.role.toLowerCase().includes(term)
    );
  });

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Users</Heading>
          <Text color="secondary"> Manage platform users and their roles.</Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {users.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search users…"
              width="100%"
            />
          ) : null}
          <Button
            icon={<Plus />}
            label="New user"
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
          {search ? "No users match your search." : "No users yet."}
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Text type="body">{user.name}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{user.email ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{user.phone ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    label={user.role.replace("_", " ")}
                    variant={roleVariant[user.role] ?? "neutral"}
                  />
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
                        setEditing(user);
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
                        setDeleting(user);
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

      <UserForm user={editing} isOpen={isFormOpen} setIsOpen={setIsFormOpen} />
      <DeleteUserDialog
        user={deleting}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
      />
    </Stack>
  );
}
