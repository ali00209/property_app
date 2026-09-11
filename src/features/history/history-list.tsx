"use client";

import {
  Badge,
  Heading,
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
import { useState } from "react";
import { Search } from "lucide-react";
import type { ActivityItem, ActivityAction } from "@/types";

const actionVariant: Record<ActivityAction, BadgeVariant> = {
  create: "green",
  update: "orange",
  delete: "red",
  hide: "teal",
  show: "cyan",
};

const entityTypeLabel: Record<string, string> = {
  users: "Users",
  userBankAccounts: "Bank accounts",
  properties: "Properties",
  propertyFeatures: "Features",
  propertyImages: "Images",
  addresses: "Addresses",
  propertyOwner: "Owners",
  transactions: "Transactions",
  leases: "Leases",
  maintenance: "Maintenance",
  documents: "Documents",
  units: "Units",
};

export function HistoryList({ activities }: { activities: ActivityItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = activities.filter((activity) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      activity.action.toLowerCase().includes(term) ||
      activity.entityType.toLowerCase().includes(term) ||
      (activity.entityLabel ?? "").toLowerCase().includes(term) ||
      (JSON.stringify(activity.details ?? "").toLowerCase().includes(term)) ||
      (activity.doneByName ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Activities</Heading>
          <Text color="secondary">
            Complete audit trail of all property actions.
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {activities.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search activities…"
              width="100%"
            />
          ) : null}
        </Stack>
      </Stack>

      {filtered.length === 0 ? (
        <Text type="body" color="secondary">
          {search
            ? "No activities match your search."
            : "No recorded activities yet."}
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Entity</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
              <TableHeaderCell>Done by</TableHeaderCell>
              <TableHeaderCell>Created at</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Badge
                    label={activity.action}
                    variant={actionVariant[activity.action]}
                  />
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {entityTypeLabel[activity.entityType] ??
                      activity.entityType}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{activity.entityLabel ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="label" color="secondary">
                    {activity.details ? JSON.stringify(activity.details) : "—"}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{activity.doneByName ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleString()
                      : "—"}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
