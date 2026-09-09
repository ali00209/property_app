import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Document, Property } from "@/types";

const iso = (value: Date | null | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : undefined;

export interface PropertyDocument extends Document {
  propertyId: string
  propertyTitle: string
}

export async function listPropertyDocuments(): Promise<PropertyDocument[]> {
  const rows = await db
    .select({
      document: schema.documents,
      property: schema.properties,
    })
    .from(schema.documents)
    .innerJoin(
      schema.properties,
      eq(schema.properties.id, schema.documents.entityId),
    )
    .where(eq(schema.documents.entityType, "properties"))
    .orderBy(desc(schema.documents.createdAt));

  return rows.map((row) => ({
    id: row.document.id,
    entityType: row.document.entityType,
    entityId: row.document.entityId,
    name: row.document.name,
    fileType: row.document.fileType,
    fileSize: row.document.fileSize,
    fileUrl: row.document.fileUrl,
    createdAt: iso(row.document.createdAt),
    propertyId: row.property.id,
    propertyTitle: row.property.title,
  }));
}

export async function listDocumentPropertyOptions(): Promise<Property[]> {
  const rows = await db
    .select()
    .from(schema.properties)
    .orderBy(desc(schema.properties.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  }));
}