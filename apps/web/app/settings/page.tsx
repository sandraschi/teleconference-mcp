"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  RotateCcw,
  Server,
  Mic,
  Video,
  Volume2,
  Palette,
  Shield,
  CheckCircle,
  Cpu,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useSettings, getMediaDevices, type AppSettings } from "@/lib/settings";
import LlmProviders from "@/components/LlmProviders";
import Toggle from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

interface MediaDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export default function SettingsPage() {
  const { settings, isLoaded, updateSettings, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [devices, setDevices] = useState<MediaDevices>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<{ name: string }[]>([]);
  const [ollamaLoadingModels, setOllamaLoadingModels] = useState(false);
  const [ollamaPullName, setOllamaPullName] = useState("");
  const [ollamaPulling, setOllamaPulling] = useState(false);
  const [ollamaPullError, setOllamaPullError] = useState<string | null>(null);
  const [ollamaPullProgress, setOllamaPullProgress] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setLocalSettings(settings);
    }
  }, [isLoaded, settings]);

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const result = await getMediaDevices();
      setDevices(result);
    } catch (e) {
      console.error("Failed to load devices:", e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const checkOllamaStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ollama/status");
      const data = (await res.json()) as { ok: boolean };
      setOllamaOk(data.ok);
      return data.ok;
    } catch {
      setOllamaOk(false);
      return false;
    }
  }, []);

  const loadOllamaModels = useCallback(async () => {
    setOllamaLoadingModels(true);
    setOllamaPullError(null);
    try {
      const res = await fetch("/api/ollama/models");
      if (!res.ok) {
        setOllamaModels([]);
        return;
      }
      const data = (await res.json()) as { models: { name: string }[] };
      setOllamaModels(data.models ?? []);
    } catch {
      setOllamaModels([]);
    } finally {
      setOllamaLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    checkOllamaStatus().then((ok) => {
      if (ok) loadOllamaModels();
    });
  }, [checkOllamaStatus, loadOllamaModels]);

  const handleOllamaPull = async () => {
    const name = ollamaPullName.trim();
    if (!name) return;
    setOllamaPulling(true);
    setOllamaPullError(null);
    setOllamaPullProgress("Starting...");
    try {
      const res = await fetch("/api/ollama/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: name, stream: true }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        setOllamaPullError(data.error ?? "Pull failed");
        setOllamaPullProgress(null);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const j = JSON.parse(t) as { status?: string; completed?: number; total?: number };
            const status = j.status ?? "";
            if (j.total != null && j.total > 0 && j.completed != null) {
              const pct = Math.round((j.completed / j.total) * 100);
              setOllamaPullProgress(`${status} ${pct}%`);
            } else {
              setOllamaPullProgress(status || "Downloading...");
            }
          } catch {
            setOllamaPullProgress(t.slice(0, 60));
          }
        }
      }
      setOllamaPullProgress(null);
      await loadOllamaModels();
      setOllamaPullName("");
    } catch (e) {
      setOllamaPullError(e instanceof Error ? e.message : String(e));
      setOllamaPullProgress(null);
    } finally {
      setOllamaPulling(false);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
  };

  const updateLocal = (key: keyof AppSettings, value: string | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure your AG-Visio experience
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              isSaved
                ? "bg-green-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* LiveKit Configuration */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Server className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              LiveKit Configuration
            </h2>
            <p className="text-gray-500 text-sm">
              Connection settings for the real-time server
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LiveKit Server URL
            </label>
            <input
              type="text"
              value={localSettings.livekitUrl}
              onChange={(e) => updateLocal("livekitUrl", e.target.value)}
              placeholder="ws://localhost:15580"
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Override for LiveKit server. When discovery is available, the server
              is auto-detected from your connection (works when joining from
              another device on the same network).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Room Name
            </label>
            <input
              type="text"
              value={localSettings.defaultRoomName}
              onChange={(e) => updateLocal("defaultRoomName", e.target.value)}
              placeholder="ag-visio-conference"
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Room name used when joining a conference
            </p>
          </div>
        </div>
      </section>

      {/* Ollama (AI agent LLM) */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-600/20 rounded-lg">
            <Cpu className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ollama (AI Agent)</h2>
            <p className="text-gray-500 text-sm">
              Model discovery, list, and load. Ollama runs outside Docker on your PC.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Status:</span>
            {ollamaOk === null ? (
              <span className="text-gray-500 text-sm">Checking...</span>
            ) : ollamaOk ? (
              <span className="text-green-500 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Running
              </span>
            ) : (
              <span className="text-amber-500 text-sm">Not running</span>
            )}
            <button
              type="button"
              onClick={() => {
                checkOllamaStatus().then((ok) => {
                  if (ok) loadOllamaModels();
                });
              }}
              className="ml-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Refresh
            </button>
          </div>

          {!ollamaOk && (
            <div className="rounded-lg bg-amber-900/20 border border-amber-800/50 p-4 text-sm text-amber-200">
              Ollama is not running. Start it on your PC (e.g. <code className="bg-neutral-800 px-1 rounded">ollama serve</code>) or install it.
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-amber-400 hover:text-amber-300"
              >
                Install Ollama <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {ollamaOk && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Installed models
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={loadOllamaModels}
                    disabled={ollamaLoadingModels}
                    className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {ollamaLoadingModels ? "Loading..." : "Refresh list"}
                  </button>
                </div>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                  {ollamaModels.length === 0 && !ollamaLoadingModels && (
                    <li className="text-gray-500">No models yet. Load one below.</li>
                  )}
                  {ollamaModels.map((m) => (
                    <li key={m.name} className="font-mono text-gray-300">
                      {m.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Load (pull) a model
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ollamaPullName}
                    onChange={(e) => setOllamaPullName(e.target.value)}
                    placeholder="e.g. gemma2, llama3.2"
                    className="flex-1 px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleOllamaPull}
                    disabled={ollamaPulling || !ollamaPullName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg transition-colors"
                  >
                    {ollamaPulling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Load
                  </button>
                </div>
                {ollamaPullProgress && (
                  <p className="text-sm text-gray-400 mt-2">{ollamaPullProgress}</p>
                )}
                {ollamaPullError && (
                  <p className="text-sm text-red-400 mt-2">{ollamaPullError}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Agent uses OLLAMA_MODEL (e.g. gemma2); set in agent env or docker-compose.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* LLM Providers (local + cloud, via backend proxy) */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Cpu className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">LLM Providers</h2>
            <p className="text-gray-500 text-sm">
              Local engines and cloud APIs. Keys stay on the backend — the browser never sees them.
            </p>
          </div>
        </div>
        <LlmProviders />
      </section>

      {/* Audio/Video Devices */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Mic className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Audio & Video Devices
              </h2>
              <p className="text-gray-500 text-sm">
                Select your preferred input/output devices
              </p>
            </div>
          </div>
          <button
            onClick={loadDevices}
            disabled={isLoadingDevices}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoadingDevices ? "Loading..." : "Detect Devices"}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Mic className="w-4 h-4" />
              Microphone
            </label>
            <select
              value={localSettings.preferredAudioInput}
              onChange={(e) => updateLocal("preferredAudioInput", e.target.value)}
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              title="Microphone Settings"
            >
              <option value="">System Default</option>
              {devices.audioInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Video className="w-4 h-4" />
              Camera
            </label>
            <select
              value={localSettings.preferredVideoInput}
              onChange={(e) => updateLocal("preferredVideoInput", e.target.value)}
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              title="Camera Settings"
            >
              <option value="">System Default</option>
              {devices.videoInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Volume2 className="w-4 h-4" />
              Speaker
            </label>
            <select
              value={localSettings.preferredAudioOutput}
              onChange={(e) => updateLocal("preferredAudioOutput", e.target.value)}
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              title="Speaker Settings"
            >
              <option value="">System Default</option>
              {devices.audioOutputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {devices.audioInputs.length === 0 && (
          <p className="text-xs text-gray-500 mt-4">
            Click &quot;Detect Devices&quot; to load available audio/video devices. You may
            need to grant browser permissions.
          </p>
        )}
      </section>

      {/* Appearance */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Palette className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Appearance</h2>
            <p className="text-gray-500 text-sm">
              Customize the look and feel
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Theme
          </label>
          <div className="flex gap-2">
            {(["dark", "light", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateLocal("theme", theme)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize transition-colors",
                  localSettings.theme === theme
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-800 text-gray-400 hover:text-white"
                )}
              >
                {theme}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            System uses your OS preference when set to system.
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-600/20 rounded-lg">
            <Shield className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Privacy</h2>
            <p className="text-gray-500 text-sm">
              Control data collection and privacy settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={localSettings.telemetryEnabled}
            onChange={(checked) => updateLocal("telemetryEnabled", checked)}
            label="Enable Telemetry"
            description="Help improve AG-Visio by sending anonymous usage data"
          />
        </div>
      </section>

      {/* Environment Info */}
      <section className="bg-neutral-800/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Environment</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Version:</span>
            <span className="text-gray-300 ml-2">2.0.0</span>
          </div>
          <div>
            <span className="text-gray-500">Environment:</span>
            <span className="text-gray-300 ml-2">
              {process.env.NODE_ENV || "development"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">LiveKit URL:</span>
            <span className="text-gray-300 ml-2 font-mono text-xs">
              {process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:15580"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
