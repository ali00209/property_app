"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogHeader,
  FormLayout,
  Heading,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { currency } from "@/lib/utils";
import type {
  PublishedPlanAssignment,
  PurchaseRequest,
} from "@/types";
import {
  approveRequestAction,
  cancelRequestAction,
  createRequestAction,
  rejectRequestAction,
} from "./actions";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

const statusVariant: Record<string, BadgeVariant> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
  cancelled: "neutral",
}

export function RequestsView({
  assignments,
  requests,
  isAdmin,
}: {
  assignments: PublishedPlanAssignment[]
  requests: PurchaseRequest[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [confirmRequest, setConfirmRequest] =
    useState<PurchaseRequest | null>(null)
  const [rejectRequest, setRejectRequest] =
    useState<PurchaseRequest | null>(null)
  const [requestPlan, setRequestPlan] =
    useState<PublishedPlanAssignment | null>(null)
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const promptError = (result: { ok: boolean; error?: { message: string } }) => {
    setErrorMessage(result.ok ? null : result.error?.message ?? "Something went wrong.")
    router.refresh()
  }

  if (isAdmin) {
    return (
      <Stack gap={5}>
        <Stack>
          <Heading level={1}>Purchase requests</Heading>
          <Text type="body" color="secondary">
            Client installment purchase requests await your review.
          </Text>
        </Stack>
        {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
        {requests.length === 0 ? (
          <Text type="body" color="secondary">
            No purchase requests yet.
          </Text>
        ) : (
          <Table dividers="rows">
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Property</TableHeaderCell>
                <TableHeaderCell>Buyer</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Down payment</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Text type="body">{request.propertyTitle}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{request.buyerName}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{request.planName}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{currency(request.price)}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="body">{currency(request.downPaymentAmount)}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={statusLabels[request.status] ?? request.status}
                      variant={statusVariant[request.status]}
                    />
                  </TableCell>
                  <TableCell>
                    <Text type="body">
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : "—"}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" ? (
                      <Stack direction="horizontal" gap={2}>
                        <Button
                          label="Approve"
                          size="sm"
                          variant="primary"
                          onClick={() => setConfirmRequest(request)}
                        />
                        <Button
                          label="Reject"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejectRequest(request)}
                        />
                      </Stack>
                    ) : (
                      <Text type="body" color="secondary">—</Text>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog
          isOpen={Boolean(confirmRequest)}
          onOpenChange={(open) => !open && setConfirmRequest(null)}
        >
          <Layout
            header={
              <LayoutHeader>
                <DialogHeader
                  title="Approve purchase request?"
                  subtitle="Approval creates the purchase contract and an installment deal with its payment schedule."
                />
              </LayoutHeader>
            }
            content={
              <LayoutContent>
                {confirmRequest ? (
                  <Text type="body">
                    This will mark {confirmRequest.propertyTitle} as under
                    contract for {confirmRequest.buyerName} (
                    {currency(confirmRequest.price)}).
                  </Text>
                ) : null}
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <Stack direction="horizontal" hAlign="between">
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onClick={() => setConfirmRequest(null)}
                  />
                  <Button
                    label="Approve"
                    variant="primary"
                    onClick={async () => {
                      if (!confirmRequest) return
                      setErrorMessage(null)
                      const result = await approveRequestAction(confirmRequest.id)
                      promptError(result as { ok: boolean; error?: { message: string } })
                      setConfirmRequest(null)
                    }}
                  />
                </Stack>
              </LayoutFooter>
            }
          />
        </Dialog>

        <Dialog
          isOpen={Boolean(rejectRequest)}
          onOpenChange={(open) => {
            if (!open) {
              setRejectRequest(null)
              setReason("")
            }
          }}
          purpose="form"
        >
          <Layout
            header={
              <LayoutHeader>
                <DialogHeader
                  title="Reject purchase request"
                  subtitle="The buyer will see the reason below."
                />
              </LayoutHeader>
            }
            content={
              <LayoutContent>
                <FormLayout>
                  <TextInput
                    label="Reason"
                    value={reason}
                    onChange={setReason}
                    placeholder="Why is this request being rejected?"
                    width="100%"
                  />
                </FormLayout>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <Stack direction="horizontal" hAlign="between">
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onClick={() => {
                      setRejectRequest(null)
                      setReason("")
                    }}
                  />
                  <Button
                    label="Reject request"
                    variant="primary"
                    isDisabled={!reason.trim()}
                    onClick={async () => {
                      if (!rejectRequest) return
                      setErrorMessage(null)
                      const result = await rejectRequestAction(rejectRequest.id, {
                        reason: reason.trim(),
                      })
                      promptError(result as { ok: boolean; error?: { message: string } })
                      setRejectRequest(null)
                      setReason("")
                    }}
                  />
                </Stack>
              </LayoutFooter>
            }
          />
        </Dialog>
      </Stack>
    )
  }

  return (
    <Stack gap={5}>
      <Stack>
        <Heading level={1}>Installment purchasing</Heading>
        <Text type="body" color="secondary">
          Browse published installment plans and track your purchase requests.
        </Text>
      </Stack>
      {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}

      <Heading level={3}>Available plans</Heading>
      {assignments.length === 0 ? (
        <Text type="body" color="secondary">
          No properties are available for installment purchase right now.
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>Plan</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Down payment</TableHeaderCell>
              <TableHeaderCell>Installment</TableHeaderCell>
              <TableHeaderCell>Term</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>
                  <Text type="body">{assignment.propertyTitle}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{assignment.planName}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{currency(assignment.price)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{currency(assignment.downPaymentAmount)}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {currency(assignment.installmentAmount)} (
                    {assignment.frequency})
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{assignment.termMonths} mo</Text>
                </TableCell>
                <TableCell>
                  <Button
                    icon={<Plus />}
                    label="Request"
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setRequestPlan(assignment)
                      setNote("")
                      setErrorMessage(null)
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Heading level={3}>My requests</Heading>
      {requests.length === 0 ? (
        <Text type="body" color="secondary">
          You have not submitted any purchase requests.
        </Text>
      ) : (
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>Plan</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Text type="body">{request.propertyTitle}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{request.planName}</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    label={statusLabels[request.status] ?? request.status}
                    variant={statusVariant[request.status]}
                  />
                </TableCell>
                <TableCell>
                  <Text type="body">{request.note ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">{request.rejectionReason ?? "—"}</Text>
                </TableCell>
                <TableCell>
                  <Text type="body">
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleDateString()
                      : "—"}
                  </Text>
                </TableCell>
                <TableCell>
                  {request.status === "pending" ? (
                    <Button
                      label="Cancel"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRequest(request)}
                    />
                  ) : (
                    <Text type="body" color="secondary">—</Text>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        isOpen={Boolean(requestPlan)}
        onOpenChange={(open) => !open && setRequestPlan(null)}
        purpose="form"
      >
        <Layout
          header={
            <LayoutHeader>
              <DialogHeader
                title="Request installment purchase"
                subtitle={
                  requestPlan
                    ? `${requestPlan.planName} · ${requestPlan.propertyTitle}`
                    : undefined
                }
              />
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <FormLayout>
                {requestPlan ? (
                  <Stack gap={2}>
                    <Text type="body">
                      Price: {currency(requestPlan.price)}
                    </Text>
                    <Text type="body">
                      Down payment: {currency(requestPlan.downPaymentAmount)} (
                      {Number(requestPlan.downPaymentPercent)}%)
                    </Text>
                    <Text type="body">
                      Installment: {currency(requestPlan.installmentAmount)}
                    </Text>
                  </Stack>
                ) : null}
                <TextInput
                  label="Note to admin (optional)"
                  value={note}
                  onChange={setNote}
                  placeholder="Anything we should know?"
                  width="100%"
                />
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <Stack direction="horizontal" hAlign="between">
                <Button
                  label="Cancel"
                  variant="ghost"
                  onClick={() => setRequestPlan(null)}
                />
                <Button
                  label="Submit request"
                  variant="primary"
                  onClick={async () => {
                    if (!requestPlan) return
                    setErrorMessage(null)
                    const result = await createRequestAction({
                      propertyPlanId: requestPlan.id,
                      note,
                    })
                    promptError(result as { ok: boolean; error?: { message: string } })
                    setRequestPlan(null)
                  }}
                />
              </Stack>
            </LayoutFooter>
          }
        />
      </Dialog>

      <Dialog
        isOpen={Boolean(confirmRequest)}
        onOpenChange={(open) => !open && setConfirmRequest(null)}
      >
        <Layout
          header={
            <LayoutHeader>
              <DialogHeader title="Cancel purchase request?" />
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <Text type="body">
                This withdraws your pending request for this plan.
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <Stack direction="horizontal" hAlign="between">
                <Button
                  label="Keep request"
                  variant="ghost"
                  onClick={() => setConfirmRequest(null)}
                />
                <Button
                  label="Cancel request"
                  variant="primary"
                  onClick={async () => {
                    if (!confirmRequest) return
                    setErrorMessage(null)
                    const result = await cancelRequestAction(confirmRequest.id)
                    promptError(result as { ok: boolean; error?: { message: string } })
                    setConfirmRequest(null)
                  }}
                />
              </Stack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </Stack>
  )
}