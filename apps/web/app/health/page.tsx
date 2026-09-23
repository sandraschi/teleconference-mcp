"use client";

import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface HealthData {
  status: string;
  livekit?: { reachable: boolean; roomCount?: number; error?: string };
  timestamp?: string;
}

interface DiscoveryData {
  livekitUrl: string;
  rooms: { name: string; participantCount: number }[];
  error?: string;
}

export default function HealthDashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [healthRes, discoveryRes] = await Promise.all([fetch("/api/health"), fetch("/api/discovery")]);
      const healthData = await healthRes.json();
      const discoveryData = await discoveryRes.json();
      setHealth(healthData);
      setDiscovery(discoveryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10000);
    return () => clearInterval(id);
  }, [fetchAll]);

  if (isLoading && !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="text-gray-500">Loading health status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6" data-testid="health-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Conference
          </Link>
          <button
            type="button"
            data-testid="health-refresh"
            onClick={fetchAll}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6">Health Dashboard</h1>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {health?.status === "ok" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Overall Status
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Status:</span>{" "}
                <span className={health?.status === "ok" ? "text-green-400" : "text-red-400"}>
                  {health?.status ?? "unknown"}
                </span>
              </p>
              {health?.timestamp && (
                <p className="text-gray-500">Last check: {new Date(health.timestamp).toLocaleString()}</p>
              )}
            </div>
          </section>

          <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {health?.livekit?.reachable ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              LiveKit Server
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Reachable:</span>{" "}
                {health?.livekit?.reachable ? (
                  <span className="text-green-400">Yes</span>
                ) : (
                  <span className="text-red-400">No</span>
                )}
              </p>
              {health?.livekit?.roomCount !== undefined && (
                <p>
                  <span className="text-gray-500">Active rooms:</span> {health.livekit.roomCount}
                </p>
              )}
              {health?.livekit?.error && <p className="text-red-400">{health.livekit.error}</p>}
            </div>
          </section>

          {discovery && (
            <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6" data-testid="health-backend">
              <h2 className="text-lg font-semibold mb-4">Discovery</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-500">LiveKit URL:</span>{" "}
                  <code className="text-gray-300">{discovery.livekitUrl}</code>
                </p>
                {discovery.error && <p className="text-yellow-500">{discovery.error}</p>}
                {discovery.rooms.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-500 mb-2">Active rooms:</p>
                    <ul className="space-y-1">
                      {discovery.rooms.map((r) => (
                        <li key={r.name} className="flex justify-between">
                          <span>{r.name}</span>
                          <span className="text-gray-500">{r.participantCount} participants</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
