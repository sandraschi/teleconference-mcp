import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:10887";

async function proxy(request: Request, method: string) {
  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/api\/llm/, "") || "/";
  const target = `${BACKEND}/api/llm${sub}${url.search}`;
  const init: RequestInit = { method, cache: "no-store" };
  if (method !== "GET" && method !== "HEAD") {
    init.headers = { "Content-Type": "application/json" };
    init.body = await request.text();
  }
  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backend unreachable" }, { status: 502 });
  }
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  return new NextResponse(body, { status: upstream.status, headers });
}

export async function GET(request: Request) {
  return proxy(request, "GET");
}

export async function POST(request: Request) {
  return proxy(request, "POST");
}

export async function DELETE(request: Request) {
  return proxy(request, "DELETE");
}
