import { NextResponse } from "next/server";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Ollama returned ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { models?: OllamaModel[] };
    return NextResponse.json({
      models: data.models ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
