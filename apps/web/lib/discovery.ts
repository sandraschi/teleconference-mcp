"use client";

import { useCallback, useEffect, useState } from "react";

export interface DiscoveredRoom {
  name: string;
  participantCount: number;
  metadata?: string;
}

export interface DiscoveryResult {
  livekitUrl: string;
  rooms: DiscoveredRoom[];
  suggestedRooms: string[];
  error?: string;
}

export function useDiscovery(refreshIntervalMs = 0) {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscovery = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/discovery");
      const data = await res.json();
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Discovery failed";
      setError(msg);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscovery();
  }, [fetchDiscovery]);

  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    const id = setInterval(fetchDiscovery, refreshIntervalMs);
    return () => clearInterval(id);
  }, [fetchDiscovery, refreshIntervalMs]);

  return {
    livekitUrl: result?.livekitUrl ?? null,
    rooms: result?.rooms ?? [],
    suggestedRooms: result?.suggestedRooms ?? [],
    discoveryError: result?.error ?? error,
    isLoading,
    refresh: fetchDiscovery,
  };
}
