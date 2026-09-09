import { requireRole } from "@/lib/auth";
import { listActivities } from "@/features/history/db-queries";
import { HistoryList } from "@/features/history/history-list";

export default async function HistoryPage() {
  await requireRole("admin", "accountant", "property_manager")
  const activities = await listActivities()

  return <HistoryList activities={activities} />
}