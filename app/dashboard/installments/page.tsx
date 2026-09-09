import { Stack } from "@astryxdesign/core";
import { requireRole } from "@/lib/auth";
import {
  listInstallmentPlans,
  listPublishedAssignments,
  listPurchaseRequests,
} from "@/features/installment/db-queries";
import { InstallmentList } from "@/features/installment/installment-list";
import { RequestsView } from "@/features/installment/request-list";

export default async function InstallmentsPage() {
  const user = await requireRole("admin", "client")

  if (user.role === "client") {
    const [assignments, requests] = await Promise.all([
      listPublishedAssignments(),
      listPurchaseRequests(user.id),
    ])
    return (
      <RequestsView assignments={assignments} requests={requests} isAdmin={false} />
    )
  }

  const [plans, requests] = await Promise.all([
    listInstallmentPlans(),
    listPurchaseRequests(null),
  ])

  return (
    <Stack gap={5}>
      <InstallmentList plans={plans} />
      <RequestsView assignments={[]} requests={requests} isAdmin />
    </Stack>
  )
}