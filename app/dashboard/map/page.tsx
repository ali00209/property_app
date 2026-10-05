import { requireRole } from "@/lib/auth";
import { getMapPayload } from "@/features/map/db-queries";
import { MapPage } from "@/features/map/map-page";

export default async function MapRoute() {
  const user = await requireRole(
    "admin",
    "client",
    "accountant",
    "maintenance_staff",
    "owner",
    "property_manager",
    "tenant",
  );
  const mapPayload = await getMapPayload(user);

  return <MapPage payload={mapPayload} />;
}
