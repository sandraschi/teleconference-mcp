import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";

const DATA_DIR = join(process.cwd(), "data");
const MEETINGS_FILE = join(DATA_DIR, "meetings.json");

export interface Meeting {
  id: string;
  title: string;
  room_name: string;
  start_utc: string;
  end_utc: string;
  duration_min: number;
  link: string;
  created_at: string;
}

async function loadMeetings(): Promise<Meeting[]> {
  try {
    const raw = await readFile(MEETINGS_FILE, "utf-8");
    const data = JSON.parse(raw) as Meeting[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveMeetings(meetings: Meeting[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MEETINGS_FILE, JSON.stringify(meetings, null, 2), "utf-8");
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") ?? "localhost:10800";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const meetings = await loadMeetings();
    const after = request.nextUrl.searchParams.get("after");
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 100);
    let list = meetings.sort((a, b) => new Date(a.start_utc).getTime() - new Date(b.start_utc).getTime());
    if (after) {
      const t = new Date(after).getTime();
      list = list.filter((m) => new Date(m.start_utc).getTime() >= t);
    }
    list = list.slice(0, limit);
    return NextResponse.json({ meetings: list });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: string;
      start_utc?: string;
      duration_min?: number;
      room_name?: string;
    };
    const title = body.title?.trim();
    const start_utc = body.start_utc?.trim();
    const duration_min = Number(body.duration_min) || 60;
    const room_name = body.room_name?.trim() || "ag-visio-conference";
    if (!title || !start_utc) {
      return NextResponse.json({ error: "Missing title or start_utc" }, { status: 400 });
    }
    const start = new Date(start_utc);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid start_utc" }, { status: 400 });
    }
    const end = new Date(start.getTime() + duration_min * 60 * 1000);
    const baseUrl = getBaseUrl(request);
    const id = generateId();
    const link = `${baseUrl}?room=${encodeURIComponent(room_name)}`;
    const meeting: Meeting = {
      id,
      title,
      room_name,
      start_utc: start.toISOString(),
      end_utc: end.toISOString(),
      duration_min,
      link,
      created_at: new Date().toISOString(),
    };
    const meetings = await loadMeetings();
    meetings.push(meeting);
    await saveMeetings(meetings);
    return NextResponse.json(meeting);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
