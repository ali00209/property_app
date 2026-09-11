import { requireRole } from "@/lib/auth";
import {
  getOwnerOptions,
  listProperties,
} from "@/features/property/db-queries";
import { getMapPayload } from "@/features/map/db-queries";
import { getGeoTree } from "@/features/geo/db-queries";
import { MapTab } from "@/features/property/map";
import { PropertyList } from "@/features/property/property-list";
import { Stack } from "@astryxdesign/core";

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
  const [properties, owners, mapPayload, geo] = await Promise.all([
    listProperties(user),
    getOwnerOptions(),
    getMapPayload(user),
    getGeoTree(),
  ]);

  return (
    <Stack gap={5}>
      <PropertyList
        properties={properties}
        owners={owners}
        geo={geo}
        userRole={"admin"}
        canManage={true}
      />

      <MapTab payload={mapPayload} />
    </Stack>
  );
}