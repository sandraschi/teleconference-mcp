"use client";

import { Download, Filter, Terminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { telemetry } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  event: string;
  metadata?: unknown;
}

const levelColors = {
  info: "text-blue-400 bg-blue-900/30",
  warning: "text-yellow-400 bg-yellow-900/30",
  error: "text-red-400 bg-red-900/30",
  success: "text-green-400 bg-green-900/30",
};

const levelLabels = {
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
  success: "OK",
};

export default function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "error" | "success">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: "info" | "warning" | "error" | "success", event: string, metadata?: unknown) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      event,
      metadata,
    };

    setLogs((prev) => [...prev.slice(-999), entry]);
  }, []);

  // Intercept telemetry logs
  useEffect(() => {
    if (!isOpen) return;
    const originalLog = telemetry.log;
    const originalError = telemetry.error;

    telemetry.log = (event: string, metadata?: unknown) => {
      originalLog(event, metadata);
      addLog("info", event, metadata);
    };

    telemetry.error = (message: string, error?: unknown) => {
      originalError(message, error);
      addLog("error", message, { error });
    };

    // Intercept console.log as well
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = (...args: unknown[]) => {
      originalConsoleLog(...args);
      addLog("info", args.join(" "));
    };

    console.warn = (...args: unknown[]) => {
      originalConsoleWarn(...args);
      addLog("warning", args.join(" "));
    };

    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      addLog("error", args.join(" "));
    };

    return () => {
      telemetry.log = originalLog;
      telemetry.error = originalError;
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }, [isOpen, addLog]);

  // Auto-scroll to bottom on new logs (logs dep is the trigger by design).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on new logs intentionally
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => filter === "all" || log.level === filter);

  const downloadLogs = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `[${log.timestamp}] ${levelLabels[log.level]}: ${log.event}${
            log.metadata ? ` | ${JSON.stringify(log.metadata)}` : ""
          }`,
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ag-visio-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Viewer" size="xl">
      <div className="flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">
              {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
              <Filter className="w-3 h-3 text-gray-500 ml-2" />
              {(["all", "info", "warning", "error", "success"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors capitalize",
                    filter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Auto-scroll Toggle */}
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>

            {/* Download */}
            <button
              type="button"
              onClick={downloadLogs}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={clearLogs}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div ref={logContainerRef} className="flex-1 overflow-y-auto px-6 py-4 bg-black/30 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600">No logs to display</div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-1 hover:bg-neutral-900/50 rounded px-2">
                  <span className="text-gray-600 flex-shrink-0 w-24">
                    {new Date(log.timestamp).toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0",
                      levelColors[log.level],
                    )}
                  >
                    {levelLabels[log.level]}
                  </span>
                  <span className="text-gray-300 flex-1">{log.event}</span>
                  {!!log.metadata && <span className="text-gray-600 text-[10px]">{JSON.stringify(log.metadata)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
