import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";

const FILES_DIR = join(process.cwd(), "data", "files");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const INDEX_FILE = join(FILES_DIR, "_index.json");
    const raw = await readFile(INDEX_FILE, "utf-8");
    const index: Array<{ id: string; type?: string; name?: string; size?: number }> = JSON.parse(raw);
    const entry = index.find((e) => e.id === id);

    if (!entry) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const filePath = join(FILES_DIR, id);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File data missing" }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": entry.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${entry.name}"`,
        "Content-Length": String(entry.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
