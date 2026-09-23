import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, getSettings, resetSettings, saveSettings } from "@/lib/settings";

const STORAGE_KEY = "ag-visio-settings"; // must match SETTINGS_KEY in settings.ts

describe("settings", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      length: 0,
      key: () => null,
    });
  });

  describe("getSettings", () => {
    it("returns default settings when localStorage is empty", () => {
      const settings = getSettings();
      expect(settings.livekitUrl).toBeDefined();
      expect(settings.defaultRoomName).toBe("ag-visio-conference");
      expect(settings.theme).toBe("dark");
      expect(settings.telemetryEnabled).toBe(true);
    });

    it("returns merged settings from localStorage", () => {
      storage[STORAGE_KEY] = JSON.stringify({
        defaultRoomName: "my-room",
        theme: "light",
      });
      const settings = getSettings();
      expect(settings.defaultRoomName).toBe("my-room");
      expect(settings.theme).toBe("light");
      expect(settings.livekitUrl).toBe(DEFAULT_SETTINGS.livekitUrl);
    });
  });

  describe("saveSettings", () => {
    it("persists partial updates", () => {
      saveSettings({ defaultRoomName: "dev-room" });
      const stored = JSON.parse(storage[STORAGE_KEY] ?? "{}");
      expect(stored.defaultRoomName).toBe("dev-room");
    });

    it("returns updated settings object", () => {
      const result = saveSettings({ sidebarCollapsed: true });
      expect(result.sidebarCollapsed).toBe(true);
    });

    it("merges with existing settings", () => {
      saveSettings({ defaultRoomName: "first" });
      saveSettings({ theme: "system" });
      const stored = JSON.parse(storage[STORAGE_KEY] ?? "{}");
      expect(stored.defaultRoomName).toBe("first");
      expect(stored.theme).toBe("system");
    });
  });

  describe("resetSettings", () => {
    it("removes settings from localStorage", () => {
      saveSettings({ defaultRoomName: "custom" });
      const result = resetSettings();
      expect(storage[STORAGE_KEY]).toBeUndefined();
      expect(result.defaultRoomName).toBe(DEFAULT_SETTINGS.defaultRoomName);
    });

    it("returns default settings", () => {
      const result = resetSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });
});
