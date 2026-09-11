import { requireRole } from "@/lib/auth";
import { getGeoTree } from "@/features/geo/db-queries";
import { GeoPage } from "@/features/geo/geo-page";

export default async function AreasPage() {
  await requireRole("admin")
  const tree = await getGeoTree()

  return <GeoPage tree={tree} />
}