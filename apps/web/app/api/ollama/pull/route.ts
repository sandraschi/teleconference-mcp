import { type NextRequest, NextResponse } from "next/server";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export async function POST(request: NextRequest) {
  let body: { model?: string; stream?: boolean };
  try {
    body = (await request.json()) as { model?: string; stream?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const model = body.model?.trim();
  if (!model) {
    return NextResponse.json({ ok: false, error: "Missing model name" }, { status: 400 });
  }
  const stream = body.stream === true;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream }),
      signal: AbortSignal.timeout(600000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: text || `Ollama returned ${res.status}` }, { status: 200 });
    }
    if (stream && res.body) {
      return new NextResponse(res.body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 },
    );
  }
}
