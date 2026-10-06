"use client";

import {
  Button,
  Heading,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@astryxdesign/core";
import { ArrowLeft, MapPinned, Plus } from "lucide-react";
import { areaUnitFilter, societyKindFilter } from "@/lib/constants";
import type {
  GeoCity,
  GeoSector,
  GeoSociety,
  GeoUnit,
} from "./db-queries";

function kindLabel(kind: string): string {
  return societyKindFilter.find((k) => k.value === kind)?.label ?? kind;
}

function areaUnitLabel(u: string | null | undefined): string {
  return areaUnitFilter.find((x) => x.value === u)?.label ?? u ?? "—";
}

export function SectionHeader({
  title,
  onBack,
  actionLabel,
  onAction,
}: {
  title: string;
  onBack: () => void;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Stack direction="horizontal" hAlign="between" vAlign="center">
      <Stack direction="horizontal" gap={2} vAlign="center">
        <Button icon={<ArrowLeft />} label="" variant="ghost" onClick={onBack} />
        <Heading level={2}>{title}</Heading>
      </Stack>
      <Button
        icon={<Plus />}
        label={actionLabel}
        variant="primary"
        onClick={onAction}
      />
    </Stack>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <Stack direction="horizontal" gap={2}>
      <Button label="Edit" size="sm" variant="ghost" onClick={onEdit} />
      <Button label="Delete" size="sm" variant="ghost" onClick={onDelete} />
    </Stack>
  );
}

export function CityTable({
  cities,
  onSelect,
  onEdit,
  onDelete,
}: {
  cities: GeoCity[];
  onSelect: (city: GeoCity) => void;
  onEdit: (city: GeoCity) => void;
  onDelete: (city: GeoCity) => void;
}) {
  return (
    <Table dividers="rows" hasHover>
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>City</TableHeaderCell>
          <TableHeaderCell>Province</TableHeaderCell>
          <TableHeaderCell>Societies</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cities.map((city) => (
          <TableRow key={city.id} onClick={() => onSelect(city)}>
            <TableCell>
              <Text type="body">{city.name}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{city.province ?? "—"}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{city.societyCount}</Text>
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={(e) => {
                  e.stopPropagation();
                  onEdit(city);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(city);
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SocietyTable({
  societies,
  onSelect,
  onEdit,
  onDelete,
}: {
  societies: GeoSociety[];
  onSelect: (society: GeoSociety) => void;
  onEdit: (society: GeoSociety) => void;
  onDelete: (society: GeoSociety) => void;
}) {
  return (
    <Table dividers="rows" hasHover>
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Kind</TableHeaderCell>
          <TableHeaderCell>Developer</TableHeaderCell>
          <TableHeaderCell>Regulator</TableHeaderCell>
          <TableHeaderCell>Active</TableHeaderCell>
          <TableHeaderCell>Sectors</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {societies.map((society) => (
          <TableRow key={society.id} onClick={() => onSelect(society)}>
            <TableCell>
              <Text type="body">{society.name}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{kindLabel(society.kind)}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{society.developer ?? "—"}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{society.regulatoryAuthority ?? "—"}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{society.isActive ? "Yes" : "No"}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{society.sectorCount}</Text>
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={(e) => {
                  e.stopPropagation();
                  onEdit(society);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(society);
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SectorTable({
  sectors,
  onSelect,
  onEdit,
  onDelete,
}: {
  sectors: GeoSector[];
  onSelect: (sector: GeoSector) => void;
  onEdit: (sector: GeoSector) => void;
  onDelete: (sector: GeoSector) => void;
}) {
  return (
    <Table dividers="rows" hasHover>
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Units</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sectors.map((sector) => (
          <TableRow key={sector.id} onClick={() => onSelect(sector)}>
            <TableCell>
              <Text type="body">{sector.name}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{sector.unitCount}</Text>
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={(e) => {
                  e.stopPropagation();
                  onEdit(sector);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(sector);
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function UnitTable({
  units,
  onEdit,
  onDelete,
}: {
  units: GeoUnit[];
  onEdit: (unit: GeoUnit) => void;
  onDelete: (unit: GeoUnit) => void;
}) {
  if (units.length === 0) {
    return (
      <Stack gap={2} vAlign="center" hAlign="center">
        <MapPinned />
        <Text type="body" color="secondary">
          No units yet. Add one with &quot;New unit&quot;.
        </Text>
      </Stack>
    );
  }

  return (
    <Table dividers="rows" hasHover>
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>Unit</TableHeaderCell>
          <TableHeaderCell>Street</TableHeaderCell>
          <TableHeaderCell>Area</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={unit.id}>
            <TableCell>
              <Text type="body">{unit.unitNumber}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">{unit.streetNumber ?? "—"}</Text>
            </TableCell>
            <TableCell>
              <Text type="body">
                {unit.areaValue
                  ? `${unit.areaValue} ${areaUnitLabel(unit.areaUnit)}`
                  : "—"}
              </Text>
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={() => onEdit(unit)}
                onDelete={() => onDelete(unit)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
