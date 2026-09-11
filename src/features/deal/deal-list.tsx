"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  Heading,
  Icon,
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
import type { BadgeVariant } from "@astryxdesign/core";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Check,
  CircleDollarSign,
  EllipseIcon,
  Ellipsis,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { currency } from "@/lib/utils";
import type {
  Deal,
  DealOption,
  DealTaxCandidates,
  Property,
  SessionUser,
} from "@/types";
import { DealForm } from "./deal-form";
import { PaymentForm } from "./payment-form";
import { SettlementForm } from "./settlement-form";
import { acceptDealAction, completeDealAction } from "./actions";

const typeLabels: Record<Deal["type"], string> = {
  cash_sale: "Cash Sale",
  fixed_lease: "Fixed Lease",
  periodic_rent: "Periodic Rent",
  installment_purchase: "Installment Purchase",
};

const statusLabels: Record<Deal["status"], string> = {
  pending_acceptance: "Pending Acceptance",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  terminated: "Terminated",
  defaulted: "Defaulted",
};

const dealStatusVariant: Record<Deal["status"], BadgeVariant> = {
  pending_acceptance: "yellow",
  active: "blue",
  completed: "green",
  cancelled: "neutral",
  terminated: "red",
  defaulted: "red",
};

function displayName(user: DealOption | undefined, id: string) {
  return user?.name ?? `${id.slice(0, 8)}…`;
}

export function DealList({
  deals,
  properties,
  users,
  taxCandidates,
  user,
}: {
  deals: Deal[];
  properties: Property[];
  users: DealOption[];
  taxCandidates: DealTaxCandidates;
  user: SessionUser;
}) {
  const router = useRouter();
  const role = user.role;
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [settlementKind, setSettlementKind] = useState<"cancel" | "terminate">(
    "cancel",
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const availableProperties = properties.filter(
    (property) => property.status === "available",
  );
  const counterpartyOptions = users
    .filter((candidate) => candidate.id !== user.id)
    .map((candidate) => ({
      value: candidate.id,
      label: `${candidate.name} · ${candidate.role}`,
    }));

  const canCreate =
    role === "admin" || role === "property_manager" || role === "owner";
  const canPay = role === "admin" || role === "accountant";
  const canAccept =
    role === "admin" ||
    role === "client" ||
    role === "owner" ||
    role === "tenant";
  const canCancel =
    role === "admin" ||
    role === "property_manager" ||
    role === "owner" ||
    role === "client" ||
    role === "tenant";
  const canTerminate =
    role === "admin" || role === "property_manager" || role === "owner";
  const canComplete = role === "admin" || role === "property_manager";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return deals;
    return deals.filter((deal) => {
      const property = deal.property?.title ?? "";
      const counterparty =
        users.find((candidate) => candidate.id === deal.counterpartyId)?.name ??
        "";
      return [
        property,
        counterparty,
        typeLabels[deal.type],
        statusLabels[deal.status],
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [deals, search, users]);

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    setActionError(null);
    const result = await action();
    if (!result.ok) {
      setActionError("The action could not be completed.");
    }
    router.refresh();
  };

  return (
    <Stack gap={5}>
      <Stack direction="horizontal" hAlign="between" vAlign="center">
        <Stack>
          <Heading level={2}>Deals</Heading>
          <Text color="secondary">
            Manage the complete sale, lease, rent, and installment lifecycle.
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={3}>
          {deals.length > 1 ? (
            <TextInput
              label=""
              startIcon={<Search />}
              value={search}
              onChange={setSearch}
              placeholder="Search deals…"
              width="100%"
            />
          ) : null}
          {canCreate ? (
            <Button
              icon={<Plus />}
              label="New Deal"
              onClick={() => setIsCreateOpen(true)}
            />
          ) : null}
        </Stack>
      </Stack>

      {actionError ? <Text color="accent">{actionError}</Text> : null}

      <Table dividers="rows" hasHover>
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Property</TableHeaderCell>
            <TableHeaderCell>Deal type</TableHeaderCell>
            <TableHeaderCell>Counterparty</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Contract value</TableHeaderCell>
            <TableHeaderCell>Tax</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell
                onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
              >
                <Text type="body" color="primary">
                  {deal.property?.title ?? "Property"}
                </Text>
              </TableCell>
              <TableCell>{typeLabels[deal.type]}</TableCell>
              <TableCell>
                {displayName(
                  users.find(
                    (candidate) => candidate.id === deal.counterpartyId,
                  ),
                  deal.counterpartyId,
                )}
              </TableCell>
              <TableCell>
                <Badge
                  label={statusLabels[deal.status]}
                  variant={dealStatusVariant[deal.status]}
                />
              </TableCell>
              <TableCell>
                {deal.totalAmount
                  ? currency(deal.totalAmount, deal.currency)
                  : "—"}
              </TableCell>
              <TableCell>{currency(deal.taxAmount, deal.currency)}</TableCell>
              <TableCell>
                {deal.createdAt
                  ? new Date(deal.createdAt).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                {/*<Stack direction="horizontal" hAlign="center" vAlign="center">*/}
                <DropdownMenu
                  button={{
                    label: "More actions",
                    icon: <Icon icon={Ellipsis} />,
                    variant: "ghost",
                    isIconOnly: true,
                    tooltip: "More actions",
                  }}
                  hasChevron={false}
                  items={[
                    {
                      label: "Accept",
                      onClick: () => run(() => acceptDealAction(deal.id)),
                      isDisabled: !canAccept,
                    },
                    {
                      label: "Record Payment",
                      onClick: () => {
                        setSelectedDeal(deal);
                        setIsPaymentOpen(true);
                      },
                      isDisabled: !canPay,
                    },
                    {
                      label: "Complete",
                      onClick: () => run(() => completeDealAction(deal.id)),
                      isDisabled: !canComplete,
                    },
                    { type: "divider" },
                    {
                      label: "Terminate",
                      onClick: () => {
                        setSelectedDeal(deal);
                        setSettlementKind("terminate");
                        setIsSettlementOpen(true);
                      },
                      isDisabled: !canTerminate,
                    },
                    {
                      label: "Cancel",
                      onClick: () => {
                        setSelectedDeal(deal);
                        setSettlementKind("cancel");
                        setIsSettlementOpen(true);
                      },
                      isDisabled: !canCancel,
                    },
                  ]}
                />
                {/*{canAccept && deal.status === "pending_acceptance" && (
                    <Button
                      label=""
                      icon={<Check size={14} />}
                      size="sm"
                      variant="ghost"
                      tooltip="Accept"
                      onClick={() => run(() => acceptDealAction(deal.id))}
                    />
                  )}
                  {canPay &&
                    ["pending_acceptance", "active"].includes(deal.status) && (
                      <Button
                        label=""
                        icon={<CircleDollarSign size={14} />}
                        size="sm"
                        variant="ghost"
                        tooltip="Record payment"
                        onClick={() => {
                          setSelectedDeal(deal);
                          setIsPaymentOpen(true);
                        }}
                      />
                    )}
                  {canCancel &&
                    ["pending_acceptance", "active"].includes(deal.status) && (
                      <Button
                        label=""
                        icon={<X size={14} />}
                        size="sm"
                        variant="ghost"
                        tooltip="Cancel deal"
                        onClick={() => {
                          setSelectedDeal(deal);
                          setSettlementKind("cancel");
                          setIsSettlementOpen(true);
                        }}
                      />
                    )}
                  {canTerminate &&
                    ["pending_acceptance", "active"].includes(deal.status) && (
                      <Button
                        label=""
                        icon={<RotateCcw size={14} />}
                        size="sm"
                        variant="ghost"
                        tooltip="Terminate deal"
                        onClick={() => {
                          setSelectedDeal(deal);
                          setSettlementKind("terminate");
                          setIsSettlementOpen(true);
                        }}
                      />
                    )}
                  {canComplete && deal.status === "active" && (
                    <Button
                      label="Complete"
                      size="sm"
                      variant="ghost"
                      tooltip="Mark completed"
                      onClick={() => run(() => completeDealAction(deal.id))}
                    />
                  )}*/}
                {/*</Stack>*/}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canCreate && (
        <DealForm
          isOpen={isCreateOpen}
          setIsOpen={setIsCreateOpen}
          propertyOptions={availableProperties.map((property) => ({
            value: property.id,
            label: `${property.title} · ${currency(property.price)}`,
          }))}
          userOptions={counterpartyOptions}
          taxCandidates={taxCandidates}
        />
      )}

      <PaymentForm
        isOpen={isPaymentOpen}
        setIsOpen={setIsPaymentOpen}
        deal={selectedDeal}
      />

      <SettlementForm
        kind={settlementKind}
        isOpen={isSettlementOpen}
        setIsOpen={setIsSettlementOpen}
        deal={selectedDeal}
      />
    </Stack>
  );
}
