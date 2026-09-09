import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/upload";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const resolved = path.resolve(UPLOAD_DIR, filename);
  const base = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(base + path.sep)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stream = createReadStream(resolved);
  const body = Readable.toWeb(stream) as ReadableStream;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String((await stat(resolved)).size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
