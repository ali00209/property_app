import { requireRole } from "@/lib/auth";
import {
  listDocumentPropertyOptions,
  listPropertyDocuments,
} from "@/features/document/db-queries";
import { DocumentList } from "@/features/document/document-list";

export default async function DocumentsPage() {
  await requireRole("admin")
  const [documents, properties] = await Promise.all([
    listPropertyDocuments(),
    listDocumentPropertyOptions(),
  ])

  return <DocumentList documents={documents} properties={properties} />
}