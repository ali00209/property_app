import { requireRole } from "@/lib/auth";
import { listDealPayments } from "@/features/transaction/db-queries";
import { TransactionList } from "@/features/transaction/transaction-list";

export default async function TransactionsPage() {
  await requireRole("admin", "accountant")
  const payments = await listDealPayments()

  return <TransactionList payments={payments} />
}