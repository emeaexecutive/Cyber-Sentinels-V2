import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const allowedDocs = new Set([
  "FOUNDER_DEMO_SCRIPT.md",
  "FOUNDER_OPERATIONAL_NARRATIVES.md",
  "FOUNDER_OPERATIONAL_RHYTHM.md",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!allowedDocs.has(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "docs", slug);
  const body = await readFile(filePath, "utf8");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
