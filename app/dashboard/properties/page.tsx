import { requireRole } from "@/lib/auth";
import {
  getOwnerOptions,
  listProperties,
} from "@/features/property/db-queries";
import { getMapPayload } from "@/features/map/db-queries";
import { MapTab } from "@/features/property/map";
import { PropertyList } from "@/features/property/property-list";
import { Stack, TabList, Tab, Text, Heading } from "@astryxdesign/core";
import { props } from "@stylexjs/stylex";

export default async function PropertiesPage() {
  const user = await requireRole(
    "admin",
    "client",
    "accountant",
    "maintenance_staff",
    "owner",
    "property_manager",
    "tenant",
  );
  const [properties, owners, mapPayload] = await Promise.all([
    listProperties(user),
    getOwnerOptions(),
    getMapPayload(user),
  ]);

  return (
    <Stack gap={5}>
      <PropertyList
        properties={properties}
        owners={owners}
        userRole={"admin"}
        canManage={true}
      />

      <MapTab payload={mapPayload} />
    </Stack>
  );
}
