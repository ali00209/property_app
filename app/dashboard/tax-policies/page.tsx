import { requireRole } from "@/lib/auth";
import { listTaxPolicies } from "@/features/tax-policy/db-queries";
import { TaxPolicyList } from "@/features/tax-policy/tax-policy-list";

export default async function TaxPoliciesPage() {
  const user = await requireRole("admin", "accountant")
  const policies = await listTaxPolicies()

  return (
    <TaxPolicyList
      policies={policies}
      canWrite={user.role === "admin"}
    />
  )
}