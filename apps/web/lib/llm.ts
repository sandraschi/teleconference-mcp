/**
 * Fleet LLM client (vendored from mcp-central-docs/templates/llm/lib-llm.ts,
 * adapted: same-origin fetch instead of @/api/client; select:false support).
 * All calls go through Next.js proxies (/api/llm/*, /api/settings/llm*) to the
 * backend on :10887. Typed keys travel in POST bodies only, never saved by test.
 */

export type ProviderKind = "local" | "cloud";
export type ModelSource = "live" | "curated" | "none";

export interface ProviderInfo {
  id: string;
  label: string;
  kind: ProviderKind;
  base_url: string;
  needs_key: boolean;
  key_env: string | null;
  configured: boolean;
  detected?: boolean;
  models?: string[];
}

export interface ModelsResponse {
  provider: string;
  models: string[];
  source: ModelSource;
  note?: string;
  error?: string;
  /** True when the names are curated stand-ins (no key) - never a success. */
  key_missing?: boolean;
}

export interface TestResponse {
  provider: string;
  ok: boolean;
  models: string[];
  source: ModelSource;
  key_missing?: boolean;
  note?: string;
  error?: string;
}

export interface OnboardingState {
  locals: Array<{ id: string; label: string; port: number | null }>;
  clouds_configured: string[];
  recommendation: { path: string; reason: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ActiveSettings {
  provider: string;
  model: string;
  keys_configured: Record<string, boolean>;
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return (await r.json()) as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let detail = `HTTP ${r.status}`;
    try {
      const d = (await r.json()) as { detail?: string };
      if (d.detail) detail = d.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await r.json()) as T;
}

async function apiDelete<T>(path: string): Promise<T> {
  const r = await fetch(path, { method: "DELETE" });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return (await r.json()) as T;
}

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = "llm_model";
const ONBOARDED_KEY = "llm_onboarded";
const SELECTION_EVENT = "llm-selection-changed";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function loadSelection(): { provider: string; model: string } {
  return {
    provider: storageGet(PROVIDER_KEY) || "ollama",
    model: storageGet(MODEL_KEY) || "",
  };
}

export function saveSelection(provider: string, model: string) {
  storageSet(PROVIDER_KEY, provider);
  storageSet(MODEL_KEY, model);
  try {
    window.dispatchEvent(new CustomEvent(SELECTION_EVENT, { detail: { provider, model } }));
  } catch {
    /* non-DOM */
  }
}

export function isOnboarded(): boolean {
  return storageGet(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  storageSet(ONBOARDED_KEY, "1");
}

export function fetchProviders(): Promise<{ providers: ProviderInfo[] }> {
  return apiGet("/api/llm/providers");
}

export function fetchModels(provider: string): Promise<ModelsResponse> {
  return apiGet(`/api/llm/models?provider=${encodeURIComponent(provider)}`);
}

export function fetchOnboarding(): Promise<OnboardingState> {
  return apiGet("/api/llm/onboarding");
}

export function fetchActive(): Promise<ActiveSettings> {
  return apiGet("/api/llm/active");
}

export function testProvider(provider: string, apiKey?: string): Promise<TestResponse> {
  return apiPost("/api/llm/test", { provider, api_key: apiKey ?? "" });
}

/** Save pair and optional key. select:false attaches the key WITHOUT touching
 *  the active pair (BUG-043: card key-saves must not hijack selection). */
export function saveLlmSettings(body: {
  provider: string;
  endpoint?: string;
  model: string;
  api_key?: string;
  select?: boolean;
}): Promise<ActiveSettings & { saved_key_for?: string }> {
  return apiPost("/api/settings/llm", body);
}

export function deleteProviderKey(provider: string): Promise<{ deleted: boolean }> {
  return apiDelete(`/api/settings/llm/key?provider=${encodeURIComponent(provider)}`);
}

export function startInstall(engine: string): Promise<{ engine: string; started: boolean; reason?: string }> {
  return apiPost("/api/llm/install", { engine });
}

export function installStatus(engine: string): Promise<{ engine: string; state: string; output?: string }> {
  return apiGet(`/api/llm/install/status?engine=${encodeURIComponent(engine)}`);
}

export async function chatComplete(provider: string, model: string, messages: ChatMessage[]): Promise<string> {
  const d = await apiPost<{ content: string }>("/api/llm/chat", { provider, model, messages });
  return d.content;
}

/** Stream assistant tokens via SSE; calls onToken per delta. Falls back to non-stream. */
export async function streamChat(
  provider: string,
  model: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let r: Response;
  try {
    r = await fetch("/api/llm/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, messages }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    throw e;
  }
  if (!r.ok || !r.body) {
    const text = await chatComplete(provider, model, messages);
    onToken(text);
    return;
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]" || payload === "") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
          error?: string;
        };
        if (chunk.error) throw new Error(chunk.error);
        const text = chunk.choices?.[0]?.delta?.content ?? "";
        if (text) onToken(text);
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.startsWith("Unexpected")) throw e;
        /* keep-alive or partial frame */
      }
    }
  }
}
