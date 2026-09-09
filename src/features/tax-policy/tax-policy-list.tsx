"use client";

import {
  Badge,
  Button,
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
} from "@astryxdesign/core";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { currency } from "@/lib/utils";
import type { TaxPolicy } from "@/types";
import { toggleTaxPolicyAction } from "./actions";
import { TaxPolicyForm } from "./tax-policy-form";

const dealTypeLabel: Record<string, string> = {
  cash_sale: "Cash",
  installment_purchase: "Installment",
  fixed_lease: "Fixed lease",
  periodic_rent: "Periodic rent",
}

export function TaxPolicyList({
  policies,
  canWrite,
}: {
  policies: TaxPolicy[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<TaxPolicy | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return policies
    return policies.filter(
      (policy) =>
        policy.name.toLowerCase().includes(term) ||
        (policy.code ?? "").toLowerCase().includes(term) ||
        policy.authority?.toLowerCase().includes(term),
    )
  }, [policies, search])

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={1}>Tax policies</Heading>
          <Text type="body" color="secondary">
            Reusable PKR tax rules applied to new sale agreements.
          </Text>
        </Stack>
        {canWrite ? (
          <Button
            icon={<Plus />}
            label="New policy"
            variant="primary"
            onClick={() => {
              setEditing(null)
              setIsOpen(true)
            }}
          />
        ) : null}
      </Stack>

      {policies.length > 1 ? (
        <TextInput
          label=""
          startIcon={<Search />}
          value={search}
          onChange={setSearch}
          placeholder="Search policies…"
          width="100%"
        />
      ) : null}

      {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}

      {filtered.length === 0 ? (
        <Text type="body" color="secondary">
          {search
            ? "No policies match your search."
            : "No tax policies yet. Create one to snapshot taxes on new sale agreements."}
        </Text>
      ) : (
        <Table dividers="rows">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Rule</TableHeaderCell>
            <TableHeaderCell>Applies to</TableHeaderCell>
            <TableHeaderCell>Effective</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {canWrite ? <TableHeaderCell>Actions</TableHeaderCell> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((policy) => (
            <TableRow key={policy.id}>
              <TableCell>
                <Stack gap={1}>
                  <Text type="body">{policy.name}</Text>
                  {policy.code ? (
                    <Text type="label" color="secondary">
                      {policy.code}
                    </Text>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell>
                <Text type="body">
                  {policy.kind === "percentage"
                    ? `${Number(policy.value)}%`
                    : currency(policy.value)}
                </Text>
              </TableCell>
              <TableCell>
                <Text type="body">
                  {policy.appliesTo.map((type) => dealTypeLabel[type]).join(", ")}
                </Text>
              </TableCell>
              <TableCell>
                <Text type="body">
                  {policy.effectiveStart ?? "Any"} – {policy.effectiveEnd ?? "Any"}
                </Text>
              </TableCell>
              <TableCell>
                <Badge
                  label={policy.active ? "Active" : "Inactive"}
                  variant={policy.active ? "green" : "neutral"}
                />
              </TableCell>
              {canWrite ? (
                <TableCell>
                  <Stack direction="horizontal" gap={2}>
                    <Button
                      label={policy.active ? "Deactivate" : "Activate"}
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const result = await toggleTaxPolicyAction(
                          policy.id,
                          !policy.active,
                        )
                        if (!result.ok) {
                          setErrorMessage(result.error.message)
                        }
                        router.refresh()
                      }}
                    />
                    <Button
                      label="Edit"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(policy)
                        setIsOpen(true)
                      }}
                    />
                  </Stack>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}

      {canWrite ? (
        <TaxPolicyForm
          policy={editing}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      ) : null}
    </Stack>
  )
}