import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";

export interface SavedUpload {
  url: string
  name: string
  fileType: string
  fileSize: number
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
}

const FILE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  xls: "xls",
  xlsx: "xlsx",
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
}

export async function saveUpload(file: File): Promise<SavedUpload> {
  const ext =
    EXTENSION_BY_MIME[file.type] ??
    path.extname(file.name).replace(".", "").toLowerCase() ??
    "bin"
  const safeExt = /^[a-z0-9]{2,5}$/i.test(ext) ? ext : "bin"
  const fileName = `${randomUUID()}.${safeExt}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer)

  return {
    url: `/api/uploads/${fileName}`,
    name: file.name,
    fileType: FILE_TYPE_BY_EXTENSION[safeExt] ?? (file.type || "other"),
    fileSize: buffer.byteLength,
  }
}