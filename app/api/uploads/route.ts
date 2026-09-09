import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/upload";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const coverImage = formData.get("coverImage");
  const files = formData.getAll("documents");

  const uploads = [];
  const coverFile = coverImage instanceof File ? coverImage : null;

  const persist = async (file: File) => {
    const ext =
      EXTENSION_BY_MIME[file.type] ??
      path.extname(file.name).replace(".", "").toLowerCase() ??
      "bin";
    const safeExt = /^[a-z0-9]{2,5}$/i.test(ext) ? ext : "bin";
    const fileName = `${randomUUID()}.${safeExt}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    return {
      url: `/api/uploads/${fileName}`,
      name: file.name,
      fileType: safeExt,
      fileSize: buffer.byteLength,
    };
  };

  if (coverFile) {
    uploads.push(await persist(coverFile));
  }
  for (const file of files) {
    if (file instanceof File) uploads.push(await persist(file));
  }

  return NextResponse.json({ ok: true, files: uploads });
}
