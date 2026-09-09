import { requireRole } from "@/lib/auth";
import { listDeals, getDealOptions } from "@/features/deal/db-queries";
import { getTaxCandidates } from "@/features/tax-policy/db-queries";
import { DealList } from "@/features/deal/deal-list";

export default async function DealsPage() {
  const user = await requireRole(
    "admin",
    "property_manager",
    "accountant",
    "owner",
    "client",
    "tenant",
  )
  const [deals, options, taxCandidates] = await Promise.all([
    listDeals(user),
    getDealOptions(),
    getTaxCandidates(),
  ])

  return (
    <DealList
      deals={deals}
      properties={options.properties}
      users={options.users}
      plans={options.plans}
      taxCandidates={taxCandidates}
      user={user}
    />
  )
}