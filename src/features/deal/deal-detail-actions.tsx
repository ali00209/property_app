"use client";

import { Button, Stack } from "@astryxdesign/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { acceptDealAction, reverseDealPaymentAction } from "./actions";

export function AcceptDealButton({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  return (
    <Button
      icon={<Check />}
      label="Accept Deal"
      variant="primary"
      isDisabled={isBusy}
      onClick={async () => {
        setIsBusy(true)
        const result = await acceptDealAction(dealId)
        if (!result.ok) {
          alert(result.error.message)
        }
        setIsBusy(false)
        router.refresh()
      }}
    />
  )
}

export function ReversePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  return (
    <Stack direction="horizontal">
      <Button
        icon={<RotateCcw />}
        label=""
        size="sm"
        variant="ghost"
        tooltip="Reverse payment"
        isDisabled={isBusy}
        onClick={async () => {
          if (!window.confirm("Reverse this payment?")) return
          setIsBusy(true)
          const result = await reverseDealPaymentAction(paymentId)
          if (!result.ok) {
            alert(result.error.message)
          }
          setIsBusy(false)
          router.refresh()
        }}
      />
    </Stack>
  )
}