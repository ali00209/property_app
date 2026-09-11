import { Badge, Card, Heading, Stack, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Text } from "@astryxdesign/core";
import type { BadgeVariant } from "@astryxdesign/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDealDetail, getActorName } from "@/features/deal/db-queries";
import { currency } from "@/lib/utils";
import { AcceptDealButton, ReversePaymentButton } from "@/features/deal/deal-detail-actions";
import type { Deal, DealStatus } from "@/types";

const typeLabels: Record<Deal["type"], string> = {
  cash_sale: "Cash Sale",
  fixed_lease: "Fixed Lease",
  periodic_rent: "Periodic Rent",
  installment_purchase: "Installment Purchase",
}

const statusLabels: Record<DealStatus, string> = {
  pending_acceptance: "Pending Acceptance",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  terminated: "Terminated",
  defaulted: "Defaulted",
}

const statusVariant: Record<DealStatus, BadgeVariant> = {
  pending_acceptance: "yellow",
  active: "blue",
  completed: "green",
  cancelled: "neutral",
  terminated: "red",
  defaulted: "red",
}

const scheduleStatusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>
}) {
  const { dealId } = await params
  const user = await requireRole(
    "admin",
    "property_manager",
    "accountant",
    "owner",
    "client",
    "tenant",
  )
  const deal = await getDealDetail(user, dealId)
  if (!deal) notFound()

  const [counterpartyName, sellerName] = await Promise.all([
    getActorName(deal.counterpartyId),
    deal.sellerId ? getActorName(deal.sellerId) : Promise.resolve(null),
  ])

  const canAccept =
    (user.role === "admin" ||
      user.role === "client" ||
      user.role === "owner" ||
      user.role === "tenant") &&
    deal.status === "pending_acceptance"
  const canReverse = user.role === "admin" || user.role === "accountant"

  const totals = (() => {
    const paid = deal.payments
      .filter((payment) => payment.status === "posted")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
    const taxCollected = deal.payments
      .filter((payment) => payment.status === "posted")
      .reduce((sum, payment) => sum + Number(payment.taxAmount), 0)
    return { paid, taxCollected }
  })()

  return (
    <Stack gap={5}>
      <Stack>
        <Stack direction="horizontal" hAlign="between" vAlign="center">
          <Stack>
            <Heading level={1}>
              {deal.property?.title ?? "Deal"}
            </Heading>
            <Stack direction="horizontal" gap={3}>
              <Badge label={typeLabels[deal.type]} variant="neutral" />
              <Badge
                label={statusLabels[deal.status]}
                variant={statusVariant[deal.status]}
              />
            </Stack>
          </Stack>
          {canAccept ? <AcceptDealButton dealId={deal.id} /> : null}
        </Stack>
        {deal.property ? (
          <Link href={`/dashboard/properties/${deal.property.id}`}>
            <Text type="body" color="accent">
              View property →
            </Text>
          </Link>
        ) : null}
      </Stack>

      <Card>
        <Stack gap={3}>
          <Heading level={3}>Overview</Heading>
          <Text type="body">
            Counterparty: {counterpartyName ?? deal.counterpartyId.slice(0, 8)}
          </Text>
          <Text type="body">
            Seller: {sellerName ?? (deal.sellerId ? deal.sellerId.slice(0, 8) : "—")}
          </Text>
          <Text type="body">Status: {statusLabels[deal.status]}</Text>
          <Text type="large">
            Contract value: {currency(deal.totalAmount, deal.currency)}
          </Text>
          <Text type="large">Tax: {currency(deal.taxAmount, deal.currency)}</Text>
          <Text type="large">
            Collected: {currency(totals.paid, deal.currency)} (tax{" "}
            {currency(totals.taxCollected, deal.currency)})
          </Text>
          {deal.startsOn ? (
            <Text type="body">Starts: {deal.startsOn}</Text>
          ) : null}
          {deal.endsOn ? <Text type="body">Ends: {deal.endsOn}</Text> : null}
        </Stack>
      </Card>

      {deal.sale ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Cash sale terms</Heading>
            <Text type="body">
              Payment method: {deal.sale.paymentMethod ?? "—"}
            </Text>
            {deal.sale.dueOn ? (
              <Text type="body">Due date: {deal.sale.dueOn}</Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {deal.lease ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Lease / rent terms</Heading>
            <Text type="body">
              Rent amount: {currency(deal.lease.rentAmount, deal.currency)} /{" "}
              {deal.lease.frequency}
            </Text>
            <Text type="body">
              Deposit: {currency(deal.lease.depositAmount, deal.currency)}
            </Text>
            <Text type="body">
              Term: {deal.lease.fixedTerm ? "Fixed" : "Periodic"}
            </Text>
          </Stack>
        </Card>
      ) : null}

      {deal.installment ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Installment terms</Heading>
            <Text type="body">
              Down payment:{" "}
              {currency(deal.installment.downPaymentAmount, deal.currency)}
            </Text>
            <Text type="body">
              Installment:{" "}
              {currency(deal.installment.installmentAmount, deal.currency)} /{" "}
              {deal.installment.frequency}
            </Text>
            <Text type="body">
              Count: {deal.installment.installmentCount}
            </Text>
          </Stack>
        </Card>
      ) : null}

      {deal.paymentSchedule.length > 0 ? (
        <Card>
          <Stack gap={3}>
            <Heading level={3}>Payment schedule</Heading>
            <Table dividers="rows">
              <TableHeader>
                <TableRow isHeaderRow>
                  <TableHeaderCell>#</TableHeaderCell>
                  <TableHeaderCell>Due</TableHeaderCell>
                  <TableHeaderCell>Principal</TableHeaderCell>
                  <TableHeaderCell>Tax</TableHeaderCell>
                  <TableHeaderCell>Paid principal</TableHeaderCell>
                  <TableHeaderCell>Paid tax</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.paymentSchedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.sequence + 1}</TableCell>
                    <TableCell>{row.dueOn ?? "—"}</TableCell>
                    <TableCell>{currency(row.principalAmount, deal.currency)}</TableCell>
                    <TableCell>{currency(row.taxAmount, deal.currency)}</TableCell>
                    <TableCell>{currency(row.paidPrincipal, deal.currency)}</TableCell>
                    <TableCell>{currency(row.paidTax, deal.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        label={scheduleStatusLabels[row.status] ?? row.status}
                        variant="neutral"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Card>
      ) : null}

      {deal.payments.length > 0 ? (
        <Card>
          <Stack gap={3}>
            <Heading level={3}>Payments</Heading>
            <Table dividers="rows">
              <TableHeader>
                <TableRow isHeaderRow>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Principal</TableHeaderCell>
                  <TableHeaderCell>Tax</TableHeaderCell>
                  <TableHeaderCell>Method</TableHeaderCell>
                  <TableHeaderCell>Reference</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Recorded</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{currency(payment.amount, deal.currency)}</TableCell>
                    <TableCell>{currency(payment.principalAmount, deal.currency)}</TableCell>
                    <TableCell>{currency(payment.taxAmount, deal.currency)}</TableCell>
                    <TableCell>{payment.paymentMethod ?? "—"}</TableCell>
                    <TableCell>{payment.reference ?? "—"}</TableCell>
                    <TableCell>{payment.status}</TableCell>
                    <TableCell>
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="horizontal" hAlign="center">
                        {canReverse && payment.status === "posted" ? (
                          <ReversePaymentButton paymentId={payment.id} />
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Card>
      ) : null}

      {deal.taxes.length > 0 ? (
        <Card>
          <Stack gap={3}>
            <Heading level={3}>Tax breakdown</Heading>
            <Table dividers="rows">
              <TableHeader>
                <TableRow isHeaderRow>
                  <TableHeaderCell>Policy</TableHeaderCell>
                  <TableHeaderCell>Kind</TableHeaderCell>
                  <TableHeaderCell>Value</TableHeaderCell>
                  <TableHeaderCell>Base</TableHeaderCell>
                  <TableHeaderCell>Tax</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell>{tax.policyName}</TableCell>
                    <TableCell>{tax.policyKind}</TableCell>
                    <TableCell>{currency(tax.policyValue, tax.currency)}</TableCell>
                    <TableCell>{currency(tax.baseAmount, tax.currency)}</TableCell>
                    <TableCell>{currency(tax.taxAmount, tax.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Card>
      ) : null}

      {deal.documents.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Documents</Heading>
            {deal.documents.map((doc) => (
              <Text type="body" key={doc.id}>
                <a href={doc.fileUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  {doc.name}
                </a>
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}

      {deal.settlements.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Settlements</Heading>
            {deal.settlements.map((settlement) => (
              <Stack key={settlement.id} gap={1}>
                <Text type="body" color="primary">
                  {settlement.kind} · refund{" "}
                  {currency(settlement.refundAmount, deal.currency)} (tax{" "}
                  {currency(settlement.refundTaxAmount, deal.currency)})
                </Text>
                {settlement.reason ? (
                  <Text type="body" color="secondary">
                    {settlement.reason}
                  </Text>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      {deal.acceptances.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Acceptances</Heading>
            {deal.acceptances.map((acceptance) => (
              <Text type="body" key={acceptance.id}>
                Accepted by {acceptance.acceptedBy.slice(0, 8)} on{" "}
                {acceptance.acceptedAt
                  ? new Date(acceptance.acceptedAt).toLocaleString()
                  : "—"}
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}

      {deal.auditLogs.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Activity</Heading>
            {deal.auditLogs.map((log) => (
              <Text type="body" color="secondary" key={log.id}>
                {String(
                  (log.details as Record<string, unknown> | null)?.event ??
                    log.action,
                )}
                {log.doneByName ? ` by ${log.doneByName}` : ""} —{" "}
                {log.createdAt
                  ? new Date(log.createdAt).toLocaleString()
                  : ""}
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}