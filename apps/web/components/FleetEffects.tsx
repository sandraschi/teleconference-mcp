"use client";

import { useEffect } from "react";

const ZOOM_KEY = "tauri-zoom";
const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0];

function applyZoom(level: number) {
  document.body.style.zoom = String(level);
  try {
    localStorage.setItem(ZOOM_KEY, String(level));
  } catch {
    /* private mode */
  }
}

/** Fleet effects: Tauri backend-status listener (HTTP poll fallback) + zoom shortcuts. */
export default function FleetEffects() {
  useEffect(() => {
    let stopPoll = false;
    // Tauri event when running under the native shell; HTTP polling otherwise.
    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<string>("backend-status", (e) => {
          document.body.dataset.backendStatus = e.payload;
        });
        return unlisten;
      } catch {
        // Not under Tauri (dev browser): poll backend health instead.
        const poll = async () => {
          if (stopPoll) return;
          try {
            const r = await fetch("/api/backend/health", { cache: "no-store" });
            document.body.dataset.backendStatus = r.ok ? "ready" : "down";
          } catch {
            document.body.dataset.backendStatus = "down";
          }
          setTimeout(poll, 15000);
        };
        poll();
        return () => {
          stopPoll = true;
        };
      }
    })();

    // Restore saved zoom.
    try {
      const saved = parseFloat(localStorage.getItem(ZOOM_KEY) ?? "1");
      if (ZOOM_LEVELS.includes(saved)) applyZoom(saved);
    } catch {
      /* ignore */
    }
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const cur = parseFloat(document.body.style.zoom || "1") || 1;
      const i = ZOOM_LEVELS.indexOf(ZOOM_LEVELS.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)));
      if (e.key === "0") {
        e.preventDefault();
        applyZoom(1.0);
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const next = ZOOM_LEVELS[Math.min(i + 1, ZOOM_LEVELS.length - 1)] ?? 1.0;
        applyZoom(next);
      } else if (e.key === "-") {
        e.preventDefault();
        const prev = ZOOM_LEVELS[Math.max(i - 1, 0)] ?? 1.0;
        applyZoom(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
