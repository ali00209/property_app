"use client";

import { AlertDialog } from "@astryxdesign/core";

type DeleteDialogProps = {
  title?: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  description?: string
  isLoading?: boolean
  onDelete: () => void
}

export default function DeleteDialog({
  title = "Archive property?",
  description = "This will archive the property and remove it from active listings. You can restore it later.",
  isOpen,
  setIsOpen,
  isLoading = false,
  onDelete,
}: DeleteDialogProps) {
  return (
    <AlertDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title={title}
      description={description}
      actionLabel="Delete"
      isActionLoading={isLoading}
      onAction={onDelete}
    />
  )
}