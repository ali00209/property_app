"use server";

import { revalidatePath } from "next/cache";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth";
import { UPLOAD_DIR, saveUpload } from "@/lib/upload";
import type { ActionResult, Document } from "@/types";
import { documentSchema } from "./validations";

function errorResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { message, fieldErrors } };
}

function catchResult(e: unknown, context: string): ActionResult<never> {
  const message = e instanceof Error && e.message ? e.message : context;
  return errorResult(message);
}

export async function createDocumentAction(
  formData: FormData,
): Promise<ActionResult<Document>> {
  const actor = await requireRole("admin");

  const entityId = formData.get("entityId");
  const name = formData.get("name");
  const file = formData.get("file");

  const parsed = documentSchema.safeParse({
    entityId: typeof entityId === "string" ? entityId : "",
    name: typeof name === "string" ? name : "",
    file: file instanceof File ? file : undefined,
  });
  if (!parsed.success) {
    return errorResult("Please fix the highlighted fields.", {
      ...parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [property] = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.id, parsed.data.entityId));
    if (!property) throw new Error("Property not found.");

    const upload = await saveUpload(parsed.data.file);
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.documents)
        .values({
          entityType: "properties",
          entityId: parsed.data.entityId,
          name: parsed.data.name,
          fileType: upload.fileType,
          fileSize: upload.fileSize,
          fileUrl: upload.url,
        })
        .returning();
      await logActivity(tx, {
        action: "create",
        entityType: "documents",
        entityId: inserted.id,
        doneBy: actor.id,
        details: JSON.stringify({ name: inserted.name }),
      });
      return inserted;
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/properties/${parsed.data.entityId}`);
    return {
      ok: true,
      data: {
        ...row,
        createdAt: row.createdAt?.toISOString(),
      },
    };
  } catch (error) {
    return catchResult(error, "Failed to upload the document.");
  }
}

export async function deleteDocumentAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("admin");
  try {
    const [row] = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id));
    if (!row) throw new Error("Document not found.");

    await db.transaction(async (tx) => {
      await tx.delete(schema.documents).where(eq(schema.documents.id, id));
      await logActivity(tx, {
        action: "delete",
        entityType: "documents",
        entityId: id,
        doneBy: actor.id,
        details: JSON.stringify({ name: row.name }),
      });
    });

    if (row.fileUrl) {
      const fileName = path.basename(row.fileUrl);
      unlink(path.join(UPLOAD_DIR, fileName)).catch(() => undefined);
    }

    revalidatePath("/dashboard/documents");
    if (row.entityId) revalidatePath(`/dashboard/properties/${row.entityId}`);
    return { ok: true, data: { id } };
  } catch (error) {
    return catchResult(error, "Failed to delete the document.");
  }
}