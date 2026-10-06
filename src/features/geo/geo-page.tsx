"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text } from "@astryxdesign/core";
import { Plus } from "lucide-react";
import type { City, Unit, Society, SocietySector } from "@/types";
import DeleteDialog from "@/components/delete-dialog";
import type { GeoTree } from "./db-queries";
import {
  deleteCityAction,
  deleteUnitAction,
  deleteSectorAction,
  deleteSocietyAction,
} from "./actions";
import { CityDialog } from "./city-dialog";
import { SocietyDialog } from "./society-dialog";
import { SectorDialog } from "./sector-dialog";
import { UnitDialog } from "./unit-dialog";
import {
  CityTable,
  SectorTable,
  SocietyTable,
  SectionHeader,
  UnitTable,
} from "./geo-tables";

export function GeoPage({ tree }: { tree: GeoTree }) {
  const router = useRouter();
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(
    null,
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const [cityOpen, setCityOpen] = useState(false);
  const [societyOpen, setSocietyOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingSociety, setEditingSociety] = useState<Society | null>(null);
  const [editingSector, setEditingSector] = useState<SocietySector | null>(
    null,
  );
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [deletingCity, setDeletingCity] = useState<City | null>(null);
  const [deletingSociety, setDeletingSociety] = useState<Society | null>(null);
  const [deletingSector, setDeletingSector] = useState<SocietySector | null>(
    null,
  );
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedCity = tree.cities.find((c) => c.id === selectedCityId) ?? null;
  const selectedSociety =
    tree.societies.find((s) => s.id === selectedSocietyId) ?? null;
  const selectedSector =
    tree.sectors.find((s) => s.id === selectedSectorId) ?? null;

  const citySocieties = tree.societies.filter(
    (s) => s.cityId === selectedCityId,
  );
  const societySectors = tree.sectors.filter(
    (s) => s.societyId === selectedSocietyId,
  );
  const sectorUnits = tree.units.filter((p) => p.sectorId === selectedSectorId);

  const unitSociety = selectedSector
    ? (tree.societies.find((s) => s.id === selectedSector.societyId) ?? null)
    : editingUnit
      ? (tree.societies.find(
          (s) =>
            s.id ===
            (tree.sectors.find((x) => x.id === editingUnit.sectorId)
              ?.societyId ?? null),
        ) ?? null)
      : null;
  const unitCity = unitSociety
    ? (tree.cities.find((c) => c.id === unitSociety.cityId) ?? null)
    : null;

  const handleDelete = async (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await fn();
    setIsDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error?.message ?? "Failed to delete.");
      return;
    }
    setDeletingCity(null);
    setDeletingSociety(null);
    setDeletingSector(null);
    setDeletingUnit(null);
    router.refresh();
  };

  return (
    <Stack gap={6}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={1}>Areas / Sectors</Heading>
          <Text type="body" color="secondary">
            City → Society → Sector → Unit. Societies, sectors and units are
            shown on the map and used when placing a property.
          </Text>
        </Stack>
        <Button
          icon={<Plus />}
          label="New city"
          variant="primary"
          onClick={() => {
            setEditingCity(null);
            setCityOpen(true);
          }}
        />
      </Stack>

      <CityTable
        cities={tree.cities}
        onSelect={(city) => {
          setSelectedCityId(city.id);
          setSelectedSocietyId(null);
          setSelectedSectorId(null);
        }}
        onEdit={(city) => {
          setEditingCity(city);
          setCityOpen(true);
        }}
        onDelete={setDeletingCity}
      />

      {selectedCity ? (
        <Stack gap={4}>
          <SectionHeader
            title={`${selectedCity.name} — societies`}
            onBack={() => setSelectedCityId(null)}
            actionLabel="New society"
            onAction={() => {
              setEditingSociety(null);
              setSocietyOpen(true);
            }}
          />

          <SocietyTable
            societies={citySocieties}
            onSelect={(society) => {
              setSelectedSocietyId(society.id);
              setSelectedSectorId(null);
            }}
            onEdit={(society) => {
              setEditingSociety(society);
              setSocietyOpen(true);
            }}
            onDelete={setDeletingSociety}
          />

          {selectedSociety ? (
            <Stack gap={4}>
              <SectionHeader
                title={`${selectedSociety.name} — sectors`}
                onBack={() => setSelectedSocietyId(null)}
                actionLabel="New sector"
                onAction={() => {
                  setEditingSector(null);
                  setSectorOpen(true);
                }}
              />

              <SectorTable
                sectors={societySectors}
                onSelect={(sector) => setSelectedSectorId(sector.id)}
                onEdit={(sector) => {
                  setEditingSector(sector);
                  setSectorOpen(true);
                }}
                onDelete={setDeletingSector}
              />

              {selectedSector ? (
                <Stack gap={4}>
                  <SectionHeader
                    title={`${selectedSector.name} — units`}
                    onBack={() => setSelectedSectorId(null)}
                    actionLabel="New unit"
                    onAction={() => {
                      setEditingUnit(null);
                      setUnitOpen(true);
                    }}
                  />

                  <UnitTable
                    units={sectorUnits}
                    onEdit={(unit) => {
                      setEditingUnit(unit);
                      setUnitOpen(true);
                    }}
                    onDelete={setDeletingUnit}
                  />
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <CityDialog
        isOpen={cityOpen}
        onClose={() => setCityOpen(false)}
        editing={editingCity}
      />
      <SocietyDialog
        isOpen={societyOpen}
        onClose={() => setSocietyOpen(false)}
        editing={editingSociety}
        cityId={selectedCityId ?? editingSociety?.cityId ?? ""}
        cities={tree.cities}
      />
      <SectorDialog
        isOpen={sectorOpen}
        onClose={() => setSectorOpen(false)}
        editing={editingSector}
        societyId={selectedSocietyId ?? editingSector?.societyId ?? ""}
      />
      <UnitDialog
        isOpen={unitOpen}
        onClose={() => setUnitOpen(false)}
        editing={editingUnit}
        sectorId={selectedSectorId ?? editingUnit?.sectorId ?? ""}
        societyBoundary={unitSociety?.boundary ?? null}
        societyCoverImage={unitSociety?.coverImage ?? null}
        cityCenter={unitCity?.centerPoint ?? null}
      />

      {deleteError ? <Text color="accent">{deleteError}</Text> : null}

      <DeleteDialog
        title={`Delete ${deletingCity ? `city "${deletingCity.name}"` : deletingSociety ? `society "${deletingSociety.name}"` : deletingSector ? `sector "${deletingSector.name}"` : deletingUnit ? `unit ${deletingUnit.unitNumber}` : ""}?`}
        description="This removes the saved record. If it has children they must be removed first."
        isOpen={Boolean(
          deletingCity || deletingSociety || deletingSector || deletingUnit,
        )}
        setIsOpen={(open) => {
          if (!open) {
            setDeletingCity(null);
            setDeletingSociety(null);
            setDeletingSector(null);
            setDeletingUnit(null);
          }
        }}
        isLoading={isDeleting}
        onDelete={() => {
          if (deletingCity)
            return handleDelete(() => deleteCityAction(deletingCity.id));
          if (deletingSociety)
            return handleDelete(() => deleteSocietyAction(deletingSociety.id));
          if (deletingSector)
            return handleDelete(() => deleteSectorAction(deletingSector.id));
          if (deletingUnit)
            return handleDelete(() => deleteUnitAction(deletingUnit.id));
          return Promise.resolve({ ok: true });
        }}
      />
    </Stack>
  );
}
