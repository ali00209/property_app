"use client";

import {
  Badge,
  Heading,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  type BadgeVariant,
} from "@astryxdesign/core";
import { useState } from "react";
import { Search } from "lucide-react";
import { currency } from "@/lib/utils";
import type { PaymentLedgerRow } from "@/types";

const statusVariant: Record<string, BadgeVariant> = {
  posted: "green",
  reversed: "red",
}

const dealTypeLabel: Record<string, string> = {
  cash_sale: "Cash sale",
  fixed_lease: "Fixed lease",
  periodic_rent: "Periodic rent",
  installment_purchase: "Installment",
}

export function TransactionList({ payments }: { payments: PaymentLedgerRow[] }) {
  const [search, setSearch] = useState("")

  const filtered = payments.filter((payment) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      payment.propertyTitle.toLowerCase().includes(term) ||
      (payment.counterpartyName ?? "").toLowerCase().includes(term) ||
      (payment.reference ?? "").toLowerCase().includes(term) ||
      (payment.recordedByName ?? "").toLowerCase().includes(term) ||
      dealTypeLabel[payment.dealType]?.toLowerCase().includes(term)
    )
  })

  return (
    <Stack gap={5}>
      <Stack>
        <Heading level={1}>Transactions</Heading>
        <Text type="body" color="secondary">
          Every payment recorded against a deal, including reversals.
        </Text>
      </Stack>

      {payments.length > 1 ? (
        <TextInput
          label=""
          startIcon={<Search />}
          value={search}
          onChange={setSearch}
          placeholder="Search transactions…"
          width="100%"
        />
      ) : null}

      {filtered.length === 0 ? (
        <Text type="body" color="secondary">
          {search
            ? "No transactions match your search."
            : "No payments recorded yet."}
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell>Counterparty</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Principal</TableHeaderCell>
              <TableHeaderCell>Tax</TableHeaderCell>
              <TableHeaderCell>Method</TableHeaderCell>
              <TableHeaderCell>Reference</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Recorded by</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <Text type="body">{payment.propertyTitle}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {dealTypeLabel[payment.dealType] ?? payment.dealType}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{payment.counterpartyName ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{currency(payment.amount)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{currency(payment.principalAmount)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{currency(payment.taxAmount)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{payment.paymentMethod ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{payment.reference ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    label={payment.status}
                    variant={statusVariant[payment.status] ?? "neutral"}
                  />
                </TableCell>
                <TableCell>
                  <Text type="body">{payment.recordedByName ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleString()
                      : "—"}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  )
}