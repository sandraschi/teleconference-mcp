"use client";

/**
 * Canonical fleet provider cards (adapted from
 * mcp-central-docs/templates/llm/LlmProviderCards.tsx: repo palette instead of
 * shadcn tokens, next/link instead of react-router).
 * Local free vs cloud paid, status dots, key entry, Test, one-click Ollama install.
 * Self-contained; the parent owns the provider list and the active selection.
 * BUG-043: card key-saves send select:false (never hijack the active pair).
 */
import { useState } from "react";
import {
  deleteProviderKey,
  installStatus,
  type ProviderInfo,
  saveLlmSettings,
  startInstall,
  type TestResponse,
  testProvider,
} from "@/lib/llm";

type Props = {
  providers: ProviderInfo[];
  probing: boolean;
  selected: string;
  /** Called after any mutation (key save/clear, install) with the affected id. */
  onChanged: (providerId: string) => Promise<void> | void;
};

const btn = "px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-200 disabled:opacity-50";
const btnPrimary = "px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50";

export function LlmProviderCards({ providers, probing, selected, onChanged }: Props) {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  const localProviders = providers.filter((p) => p.kind === "local");
  const cloudProviders = providers.filter((p) => p.kind === "cloud");

  function statusDot(p: ProviderInfo) {
    if (p.kind === "local") {
      if (probing) return <span className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />;
      return p.detected ? (
        <span className="h-2 w-2 rounded-full bg-green-500" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-gray-600" />
      );
    }
    return p.configured ? (
      <span className="h-2 w-2 rounded-full bg-green-500" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-amber-500" />
    );
  }

  function statusText(p: ProviderInfo): string {
    if (p.kind === "local") {
      if (probing) return "Probing…";
      return p.detected ? `Detected · ${p.models?.length ?? 0} models` : "Not found";
    }
    return p.configured ? "Key configured" : "Missing key";
  }

  async function saveKey(id: string) {
    const key = keyInputs[id]?.trim();
    if (!key) return;
    setCardMsg((m) => ({ ...m, [id]: "Saving…" }));
    try {
      // BUG-043: select:false — attaching a key must not hijack the active pair.
      await saveLlmSettings({ provider: id, model: "", api_key: key, select: false });
      setKeyInputs((k) => ({ ...k, [id]: "" }));
      await onChanged(id);
      setCardMsg((m) => ({ ...m, [id]: "Key saved." }));
    } catch (e) {
      setCardMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function clearKey(id: string) {
    setCardMsg((m) => ({ ...m, [id]: "Clearing…" }));
    try {
      await deleteProviderKey(id);
      await onChanged(id);
      setCardMsg((m) => ({ ...m, [id]: "Key cleared." }));
    } catch (e) {
      setCardMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function runTest(id: string) {
    setCardMsg((m) => ({ ...m, [id]: "Testing…" }));
    try {
      // Offer the card's typed key (if any): testing without it reports curated
      // names as success while status stays unkeyed. Key in POST body, never saved.
      const typed = keyInputs[id]?.trim() || undefined;
      const t: TestResponse = await testProvider(id, typed);
      if (t.ok) {
        setCardMsg((m2) => ({
          ...m2,
          [id]: `Key valid — ${t.models.length} live model(s).${typed ? " Save key to keep it." : ""}`,
        }));
      } else {
        setCardMsg((m2) => ({ ...m2, [id]: t.note || "Not reachable — check the endpoint." }));
      }
    } catch (e) {
      setCardMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function installOllama() {
    setInstalling(true);
    setInstallMsg("Starting winget install…");
    try {
      await startInstall("ollama");
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const st = await installStatus("ollama");
        if (st.state === "done") {
          setInstallMsg("Installed. Re-probing.");
          await onChanged("ollama");
          setInstallMsg("Ollama installed and detected. Pull a model: ollama pull qwen3:32b");
          break;
        }
        if (st.state === "error") {
          setInstallMsg(`Install failed: ${(st.output ?? "").slice(-300) || "see backend logs"}`);
          break;
        }
        setInstallMsg(`Installing… (${i * 5 + 5}s)`);
      }
    } catch (e) {
      setInstallMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  }

  function card(p: ProviderInfo, badge: string) {
    return (
      <div
        key={p.id}
        data-testid={`llm-provider-card-${p.id}`}
        className={`p-4 space-y-2 rounded-xl border bg-neutral-900 ${
          p.id === selected ? "border-blue-500/60" : "border-gray-800"
        }`}
      >
        <div className="flex items-center gap-2">
          {statusDot(p)}
          <span className="text-sm font-semibold text-white">{p.label}</span>
          <span className="text-[10px] rounded bg-neutral-800 px-1.5 py-0.5 text-gray-400">{badge}</span>
          <span className="text-xs text-gray-400 ml-auto">{statusText(p)}</span>
        </div>
        {p.id === "ollama" && !p.detected && !probing && (
          <div className="text-xs text-gray-400 rounded border border-gray-800 px-2 py-1.5 space-y-2">
            <p>
              Not running. Manual: <code className="font-mono">ollama serve</code> — or:
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={btnPrimary}
                data-testid="llm-install-ollama"
                disabled={installing}
                onClick={() => void installOllama()}
              >
                {installing ? "Installing…" : "Install Ollama now"}
              </button>
              {installMsg && <span className="text-gray-400">{installMsg}</span>}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" className={btn} data-testid={`llm-test-${p.id}`} onClick={() => void runTest(p.id)}>
            Test
          </button>
          {cardMsg[p.id] && <span className="text-xs text-gray-400 self-center">{cardMsg[p.id]}</span>}
        </div>
        {p.kind === "cloud" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type={showKeys[p.id] ? "text" : "password"}
              value={keyInputs[p.id] ?? ""}
              onChange={(e) => setKeyInputs((k) => ({ ...k, [p.id]: e.target.value }))}
              placeholder={p.configured ? "•••••••• configured" : `Paste ${p.key_env}`}
              aria-label={`${p.label} API key`}
              data-testid={`llm-key-${p.id}`}
              className="flex-1 min-w-40 rounded border border-gray-700 bg-neutral-950 px-2 py-1 text-xs font-mono text-white"
            />
            <button type="button" className={btn} onClick={() => setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))}>
              {showKeys[p.id] ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!keyInputs[p.id]?.trim()}
              onClick={() => void saveKey(p.id)}
            >
              Save key
            </button>
            {p.configured && (
              <button type="button" className={btn} onClick={() => void clearKey(p.id)}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {localProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">Local engines (free)</p>
          {localProviders.map((p) => card(p, "local · free"))}
        </div>
      )}
      {cloudProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">Cloud (API key)</p>
          {cloudProviders.map((p) => card(p, "cloud · paid"))}
        </div>
      )}
    </div>
  );
}
