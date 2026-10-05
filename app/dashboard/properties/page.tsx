import { requireRole } from "@/lib/auth";
import {
  getOwnerOptions,
  listProperties,
} from "@/features/property/db-queries";
import { getGeoTree } from "@/features/geo/db-queries";
import { PropertyList } from "@/features/property/property-list";

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
  const [properties, owners, geo] = await Promise.all([
    listProperties(user),
    getOwnerOptions(),
    getGeoTree(),
  ]);

  return (
    <PropertyList
      properties={properties}
      owners={owners}
      geo={geo}
      userRole={"admin"}
      canManage={true}
    />
  );
}