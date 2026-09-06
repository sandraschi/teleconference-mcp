"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Wrench, Play, ChevronDown, ChevronUp, Terminal, CheckCircle2, XCircle } from "lucide-react";

interface BackendHealth {
  status: string;
  tool_count?: number;
  providers?: { livekit?: string; ollama?: string };
  uptime_seconds?: number;
}

interface InvokeResult {
  ok?: boolean;
  name?: string;
  result?: unknown;
  error?: string;
}

const TOOL_GROUPS: Record<string, string[]> = {
  Conferences: ["conference_schedule", "conference_get", "conference_list", "conference_update", "conference_cancel", "conference_upcoming", "list_active_conferences", "notify_conference_active"],
  Participants: ["participant_invite", "participant_list_invited", "participant_remove_invited"],
  Rooms: ["room_create", "room_list", "room_delete", "room_update_metadata", "room_participant_list", "room_participant_kick", "room_participant_mute", "room_send_data"],
  Intelligence: ["generate_meeting_summary", "extract_action_items", "set_translation_language"],
  System: ["inter_agent_ping", "get_dev_stats", "query_system_logs", "sample_log_analysis", "get_substrate_heartbeat", "orchestrate_industrial_diagnostics", "orchestrate_remote_support", "sample_system_forensics"],
};

export default function ToolsPage() {
  const [tools, setTools] = useState<string[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, InvokeResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [toolsRes, healthRes] = await Promise.all([
        fetch("/api/backend/tools"),
        fetch("/api/backend/health"),
      ]);
      const toolsData = await toolsRes.json();
      const healthData = await healthRes.json();
      setTools((toolsData.tools ?? []).map((t: { name: string }) => t.name));
      setHealth(healthData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backend unreachable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const invoke = async (name: string) => {
    setRunning(name);
    try {
      const res = await fetch("/api/backend/tools/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: {} }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [name]: data }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [name]: { ok: false, error: e instanceof Error ? e.message : "invoke failed" },
      }));
    } finally {
      setRunning(null);
    }
  };

  const backendAlive = health?.status === "ok";
  const grouped = Object.entries(TOOL_GROUPS);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold">MCP Tools</h1>
          </div>
          <button
            onClick={fetchAll}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mb-6">
            <p className="text-red-400">{error}</p>
            <p className="text-red-500/70 text-xs mt-1">
              The FastMCP backend was not reachable. Start it with{" "}
              <code className="bg-neutral-800 px-1 py-0.5 rounded">start.ps1</code> (backend :10887, health :10891).
            </p>
          </div>
        )}

        {health && (
          <section className="bg-neutral-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              {backendAlive ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-gray-400">Backend:</span>
              <span className={backendAlive ? "text-green-400" : "text-red-400"}>
                {health.status}
              </span>
            </span>
            <span className="text-gray-400">
              Tools: <span className="text-white">{health.tool_count ?? tools.length}</span>
            </span>
            <span className="text-gray-400">
              LiveKit:{" "}
              <span className={health.providers?.livekit === "ALIVE" ? "text-green-400" : "text-red-400"}>
                {health.providers?.livekit ?? "unknown"}
              </span>
            </span>
            <span className="text-gray-400">
              Ollama:{" "}
              <span className={health.providers?.ollama === "ALIVE" ? "text-green-400" : "text-red-400"}>
                {health.providers?.ollama ?? "unknown"}
              </span>
            </span>
          </section>
        )}

        {grouped.map(([group, names]) => {
          const present = names.filter((n) => tools.includes(n));
          if (present.length === 0) return null;
          return (
            <section key={group} className="mb-8">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">{group}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {present.map((name) => {
                  const result = results[name];
                  const isOpen = expanded[name];
                  return (
                    <div key={name} className="bg-neutral-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <code className="text-sm text-blue-400 truncate">{name}</code>
                        <button
                          onClick={() => invoke(name)}
                          disabled={running === name}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs disabled:opacity-50"
                        >
                          {running === name ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          Run
                        </button>
                      </div>
                      {result && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpanded((p) => ({ ...p, [name]: !p[name] }))}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                          >
                            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {result.ok === false ? "Error" : "Result"}
                            <span
                              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                                result.ok === false ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"
                              }`}
                            >
                              {result.ok === false ? "ERR" : "OK"}
                            </span>
                          </button>
                          {isOpen && (
                            <pre className="mt-2 p-3 bg-neutral-950 border border-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
                              {JSON.stringify(result.result ?? result.error ?? result, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!isLoading && tools.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <Terminal className="w-10 h-10" />
            <p>No tools discovered from the backend.</p>
          </div>
        )}
      </div>
    </div>
  );
}
