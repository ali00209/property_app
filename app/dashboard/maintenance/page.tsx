import { requireRole } from "@/lib/auth";
import {
  listAssigneeOptions,
  listMaintenances,
  listPropertyOptions,
} from "@/features/maintenance/db-queries";
import { MaintenanceList } from "@/features/maintenance/maintenance-list";

export default async function MaintenancePage() {
  await requireRole("admin", "maintenance_staff")
  const [requests, properties, assignees] = await Promise.all([
    listMaintenances(),
    listPropertyOptions(),
    listAssigneeOptions(),
  ])

  return (
    <MaintenanceList
      requests={requests}
      properties={properties}
      assignees={assignees}
    />
  )
}