"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * LLM provider cards (vendored arxiv-mcp pilot pattern).
 * All traffic goes to the conferencing backend proxy (:10891) — the browser
 * never talks to providers directly and never sees key bytes.
 */

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10891";

interface Provider {
  id: string;
  label: string;
  kind: "local" | "cloud";
  base_url: string;
  needs_key: boolean;
  key_env: string | null;
  configured: boolean;
}

interface ModelsResp {
  provider: string;
  models: string[];
  source: "live" | "curated" | "none";
}

export default function LlmProviders() {
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState("");
  const [model, setModel] = useState("");
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, ModelsResp>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [provRes, savedRes] = await Promise.all([
        fetch(`${BACKEND}/api/llm/providers`),
        fetch(`${BACKEND}/api/settings/llm`),
      ]);
      if (!provRes.ok || !savedRes.ok) throw new Error(`backend ${provRes.status}`);
      const prov = await provRes.json();
      const saved = await savedRes.json();
      setProviders(prov.providers ?? []);
      setSelected(saved.provider || localStorage.getItem("llm_provider") || "ollama");
      setModel(saved.model || localStorage.getItem("llm_model") || "");
      setBackendUp(true);
    } catch {
      setBackendUp(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testProvider = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setMsg((m) => ({ ...m, [id]: "" }));
    try {
      const res = await fetch(`${BACKEND}/api/llm/models?provider=${encodeURIComponent(id)}`);
      const data: ModelsResp = await res.json();
      setModelsByProvider((p) => ({ ...p, [id]: data }));
      setMsg((m) => ({
        ...m,
        [id]: data.models.length
          ? `${data.models.length} models (${data.source})`
          : data.source === "none"
            ? "Not detected"
            : "No models listed",
      }));
    } catch (e) {
      setMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Test failed" }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const saveKey = async (id: string) => {
    const key = (keys[id] || "").trim();
    if (!key) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`${BACKEND}/api/settings/llm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id, model: "", api_key: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setKeys((k) => ({ ...k, [id]: "" }));
      setMsg((m) => ({ ...m, [id]: "Key saved" }));
      load();
    } catch (e) {
      setMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Save failed" }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const clearKey = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fetch(`${BACKEND}/api/settings/llm/key?provider=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setMsg((m) => ({ ...m, [id]: "Key cleared" }));
      load();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const saveSelection = async (providerId: string, modelName: string) => {
    setSelected(providerId);
    setModel(modelName);
    localStorage.setItem("llm_provider", providerId);
    localStorage.setItem("llm_model", modelName);
    try {
      await fetch(`${BACKEND}/api/settings/llm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, model: modelName }),
      });
    } catch {
      // selection persists locally; backend sync is best-effort
    }
  };

  if (backendUp === false) {
    return (
      <p className="text-sm text-yellow-500">
        Backend unreachable at {BACKEND} — start it with <code className="bg-neutral-800 px-1 rounded">.\start.ps1 all</code> to
        manage LLM providers.
      </p>
    );
  }
  if (backendUp === null) {
    return <p className="text-sm text-gray-500">Loading providers…</p>;
  }

  const locals = providers.filter((p) => p.kind === "local");
  const clouds = providers.filter((p) => p.kind === "cloud");

  const card = (p: Provider) => (
    <div
      key={p.id}
      data-testid={`llm-provider-card-${p.id}`}
      className="bg-neutral-800/60 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{p.label}</span>
        <span className="flex items-center gap-2 text-xs">
          <span
            className={`px-2 py-0.5 rounded ${p.kind === "local" ? "bg-green-900/40 text-green-400" : "bg-blue-900/40 text-blue-400"}`}
          >
            {p.kind === "local" ? "Local · free" : "Cloud · paid"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${p.configured ? "bg-green-500" : "bg-red-500"}`}
            title={p.configured ? "Configured" : p.needs_key ? "Missing key" : "Not detected"}
          />
        </span>
      </div>
      {p.kind === "cloud" && (
        <div className="flex gap-2 mt-2">
          <input
            data-testid={`llm-key-${p.id}`}
            type="password"
            value={keys[p.id] || ""}
            onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
            placeholder={p.configured ? `${p.key_env} configured` : `Paste ${p.key_env}`}
            className="flex-1 px-3 py-1.5 bg-neutral-900 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
          />
          <button
            onClick={() => saveKey(p.id)}
            disabled={busy[p.id] || !(keys[p.id] || "").trim()}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-sm disabled:opacity-50"
          >
            Save
          </button>
          {p.configured && (
            <button
              onClick={() => clearKey(p.id)}
              disabled={busy[p.id]}
              className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          data-testid={`llm-test-${p.id}`}
          onClick={() => testProvider(p.id)}
          disabled={busy[p.id]}
          className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm disabled:opacity-50"
        >
          {busy[p.id] ? "Testing…" : "Test"}
        </button>
        {(modelsByProvider[p.id]?.models.length ?? 0) > 0 && (
          <select
            data-testid="llm-model-select"
            value={selected === p.id ? model : ""}
            onChange={(e) => saveSelection(p.id, e.target.value)}
            className="flex-1 px-2 py-1.5 bg-neutral-900 border border-gray-700 rounded text-sm text-white"
          >
            <option value="">Select model…</option>
            {modelsByProvider[p.id].models.map((m) => (
              <option key={m} value={m}>
                {m} ({modelsByProvider[p.id].source})
              </option>
            ))}
          </select>
        )}
        {msg[p.id] && <span className="text-xs text-gray-400">{msg[p.id]}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-400">Active:</span>
        <select
          data-testid="llm-provider-select"
          value={selected}
          onChange={(e) => saveSelection(e.target.value, "")}
          className="px-2 py-1.5 bg-neutral-900 border border-gray-700 rounded text-sm text-white"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {model && <span className="text-sm text-gray-300 font-mono">{model}</span>}
      </div>
      <h3 className="text-sm font-semibold text-gray-300 mt-4 mb-2">Local engines</h3>
      <div className="grid gap-3 md:grid-cols-3">{locals.map(card)}</div>
      <h3 className="text-sm font-semibold text-gray-300 mt-4 mb-2">Cloud APIs</h3>
      <div className="grid gap-3 md:grid-cols-2">{clouds.map(card)}</div>
      <p className="text-xs text-gray-500 mt-3">
        Keys are stored in a 0600 keystore on the backend (or env vars, which win) and never
        shown again. The browser never contacts providers directly.
      </p>
    </div>
  );
}
