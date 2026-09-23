import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";

const FILES_DIR = join(process.cwd(), "data", "files");
const INDEX_FILE = join(FILES_DIR, "_index.json");

interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
  uploaded_by: string;
}

async function getIndex(): Promise<FileEntry[]> {
  try {
    const raw = await readFile(INDEX_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveIndex(index: FileEntry[]) {
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadedBy = (formData.get("uploaded_by") as string) || "anonymous";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const entry: FileEntry = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy,
    };

    await mkdir(FILES_DIR, { recursive: true });
    await writeFile(join(FILES_DIR, id), buffer);

    const index = await getIndex();
    index.unshift(entry);
    await saveIndex(index);

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const index = await getIndex();
    return NextResponse.json({ files: index });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "List failed" }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
