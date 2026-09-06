"use client";

import { useState, useEffect, useCallback } from "react";

export interface AppSettings {
  // LiveKit Configuration
  livekitUrl: string;
  defaultRoomName: string;

  // Media Devices
  preferredAudioInput: string;
  preferredVideoInput: string;
  preferredAudioOutput: string;

  // UI Preferences
  theme: "dark" | "light" | "system";
  sidebarCollapsed: boolean;

  // Privacy
  telemetryEnabled: boolean;
}

const SETTINGS_KEY = "ag-visio-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:15580",
  defaultRoomName: "ag-visio-conference",
  preferredAudioInput: "",
  preferredVideoInput: "",
  preferredAudioOutput: "",
  theme: "dark",
  sidebarCollapsed: false,
  telemetryEnabled: true,
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Failed to parse settings:", e);
  }

  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }

  return updated;
}

export function resetSettings(): AppSettings {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (e) {
    console.error("Failed to reset settings:", e);
  }
  return DEFAULT_SETTINGS;
}

// React hook for settings
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    const updated = saveSettings(updates);
    setSettings(updated);
  }, []);

  const reset = useCallback(() => {
    const defaults = resetSettings();
    setSettings(defaults);
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings: reset,
  };
}

// Get available media devices
export async function getMediaDevices(): Promise<{
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> {
  try {
    // Request permissions first to get device labels
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      audioInputs: devices.filter((d) => d.kind === "audioinput"),
      videoInputs: devices.filter((d) => d.kind === "videoinput"),
      audioOutputs: devices.filter((d) => d.kind === "audiooutput"),
    };
  } catch (e) {
    console.error("Failed to enumerate devices:", e);
    return {
      audioInputs: [],
      videoInputs: [],
      audioOutputs: [],
    };
  }
}
