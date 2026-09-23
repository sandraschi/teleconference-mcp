"use client";

/**
 * Settings LLM section: canonical fleet stack (onboarding full + active-pair
 * row + provider cards). Owns provider/selection state; keys via cards only.
 */
import { useCallback, useEffect, useState } from "react";
import {
  fetchActive,
  fetchModels,
  fetchProviders,
  loadSelection,
  type ProviderInfo,
  saveLlmSettings,
  saveSelection,
} from "@/lib/llm";
import { LlmOnboarding } from "./LlmOnboarding";
import { LlmProviderCards } from "./LlmProviderCards";
import { PageLoading } from "./PageLoading";

export function LlmSettingsSection() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [probing, setProbing] = useState(true);
  const [selected, setSelected] = useState(loadSelection().provider);
  const [model, setModel] = useState(loadSelection().model);
  const [models, setModels] = useState<string[]>([]);
  const [modelsSource, setModelsSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProbing(true);
    try {
      const [pv, active] = await Promise.all([fetchProviders(), fetchActive().catch(() => null)]);
      setProviders(pv.providers);
      if (active) {
        setSelected(active.provider || loadSelection().provider);
        setModel(active.model || "");
      }
    } finally {
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    (async () => {
      if (!selected) {
        setModels([]);
        return;
      }
      try {
        const m = await fetchModels(selected);
        setModels(m.models);
        setModelsSource(m.source + (m.key_missing ? " (key missing)" : ""));
      } catch {
        setModels([]);
        setModelsSource("error");
      }
    })();
  }, [selected]);

  async function savePair() {
    setSaving(true);
    setMsg(null);
    try {
      await saveLlmSettings({ provider: selected, model });
      saveSelection(selected, model);
      setMsg("Active pair saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <LlmOnboarding mode="full" />
      <div className="rounded-xl border border-gray-800 bg-neutral-900 p-4">
        <p className="text-sm font-semibold text-white mb-2">Active provider</p>
        {probing && providers.length === 0 ? (
          <PageLoading variant="inline" label="Probing providers…" testId="llm-probing" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Active LLM provider"
              data-testid="llm-provider-select"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setModel("");
              }}
              className="px-3 py-1.5 bg-neutral-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Active LLM model"
              data-testid="llm-model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-1.5 bg-neutral-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">Select model…</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="llm-pair-save"
              onClick={savePair}
              disabled={saving || !selected}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white"
            >
              {saving ? "Saving…" : "Use this pair"}
            </button>
            {modelsSource && <span className="text-xs text-gray-400">models: {modelsSource}</span>}
            {msg && <span className="text-xs text-gray-300">{msg}</span>}
          </div>
        )}
      </div>
      <LlmProviderCards providers={providers} probing={probing} selected={selected} onChanged={refresh} />
    </div>
  );
}
