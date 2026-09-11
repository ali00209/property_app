"use client";

import {
  Badge,
  Button,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Heading,
} from "@astryxdesign/core";
import type { BadgeVariant } from "@astryxdesign/core";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, RotateCcw } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Property, PropertyDetail, UserRole } from "@/types";
import type { GeoTree } from "@/features/geo/db-queries";
import { PropertyForm } from "./property-form";
import { archivePropertyAction, restorePropertyAction } from "./actions";
import DeleteDialog from "@/components/delete-dialog";

const statusVariant: Record<Property["status"], BadgeVariant> = {
  available: "green",
  off_market: "blue",
  archived: "neutral",
  maintenance: "teal",
  occupied: "orange",
  vacant: "blue",
};

export function PropertyList({
  properties,
  owners,
  geo,
  userRole,
  canManage,
}: {
  properties: PropertyDetail[];
  owners: Array<{ id: string; name: string }>;
  geo: GeoTree;
  userRole: UserRole;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyDetail | null>(null);
  const [archiving, setArchiving] = useState<PropertyDetail | null>(null);
  const [restoring, setRestoring] = useState<PropertyDetail | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.address?.city?.toLowerCase().includes(q) ||
        p.address?.street?.toLowerCase().includes(q),
    );
  }, [properties, search]);

  async function handleArchive() {
    if (!archiving) return;
    setIsArchiving(true);
    const result = await archivePropertyAction(archiving.id);
    setIsArchiving(false);
    setArchiving(null);
    if (result.ok) router.refresh();
  }

  async function handleRestore() {
    if (!restoring) return;
    setIsRestoring(true);
    const result = await restorePropertyAction(restoring.id);
    setIsRestoring(false);
    setRestoring(null);
    if (result.ok) router.refresh();
  }

  return (
    <Stack gap={5}>
      {canManage ? (
        <Stack direction="horizontal" hAlign="between" vAlign="center">
          <Stack>
            <Heading level={2}>Properties</Heading>
            <Text color="secondary">Manage your property portfolio</Text>
          </Stack>
          <Stack direction="horizontal" gap={3}>
            {properties.length > 1 ? (
              <TextInput
                label=""
                startIcon={<Search />}
                value={search}
                onChange={setSearch}
                placeholder="Search properties…"
                width="100%"
              />
            ) : null}
            <Button
              icon={<Plus />}
              label="Add Property"
              variant="primary"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            />
          </Stack>
        </Stack>
      ) : null}

      <Table dividers="rows" hasHover>
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Area</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((property) => (
            <TableRow
              key={property.id}
              onClick={() =>
                router.push(`/dashboard/properties/${property.id}`)
              }
            >
              <TableCell>
                <Text type="body" color="primary">
                  {property.title}
                </Text>
              </TableCell>
              <TableCell>{property.type.replace("_", " ")}</TableCell>
              <TableCell>
                <Badge
                  label={property.status.replace("_", " ")}
                  variant={statusVariant[property.status]}
                />
              </TableCell>
              <TableCell>${formatMoney(property.price)}</TableCell>
              <TableCell>
                {property.areaValue} {property.areaUnit}
              </TableCell>
              <TableCell>
                {property.address
                  ? [property.address.street, property.address.city]
                      .filter(Boolean)
                      .join(", ")
                  : "—"}
              </TableCell>
              <TableCell>
                <Stack direction="horizontal" hAlign="center" vAlign="center">
                  <Button
                    label=""
                    icon={<Pencil size={14} />}
                    size="sm"
                    variant="ghost"
                    tooltip="Edit property"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(property);
                      setIsFormOpen(true);
                    }}
                  />
                  {property.status === "archived" ? (
                    <Button
                      label=""
                      icon={<RotateCcw size={14} />}
                      size="sm"
                      variant="ghost"
                      tooltip="Restore property"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRestoring(property);
                      }}
                    />
                  ) : (
                    <Button
                      label=""
                      icon={<Trash2 size={14} />}
                      size="sm"
                      variant="ghost"
                      tooltip="Archive property"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchiving(property);
                      }}
                    />
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 ? (
        <Card>
          <Text color="secondary">No properties found.</Text>
        </Card>
      ) : null}

      <PropertyForm
        editing={editing}
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        owners={owners}
        geo={geo}
        propertyList={properties}
      />

      <DeleteDialog
        title="Archive property?"
        description="This will archive the property and remove it from active listings. You can restore it later."
        isOpen={Boolean(archiving)}
        setIsOpen={(open) => {
          if (!open) setArchiving(null);
        }}
        isLoading={isArchiving}
        onDelete={handleArchive}
      />

      <DeleteDialog
        title="Restore property?"
        description="This will restore the property to available listings."
        isOpen={Boolean(restoring)}
        setIsOpen={(open) => {
          if (!open) setRestoring(null);
        }}
        isLoading={isRestoring}
        onDelete={handleRestore}
      />
    </Stack>
  );
}
