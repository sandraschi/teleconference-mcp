import { beforeEach, describe, expect, it, vi } from "vitest";
import { telemetry } from "@/lib/telemetry";

describe("telemetry", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("log() calls console.log with JSON payload", () => {
    telemetry.log("TEST_EVENT", { foo: "bar" });
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleLogSpy.mock.calls[0];
    if (!firstCall) throw new Error("console.log was not called");
    const call = firstCall[0] as string;
    expect(call).toContain("[SOTA-TELEMETRY]");
    const json = call.replace("[SOTA-TELEMETRY] ", "");
    const payload = JSON.parse(json);
    expect(payload.event).toBe("TEST_EVENT");
    expect(payload.foo).toBe("bar");
    expect(payload.context).toBe("AG-Visio-SOTA-Web");
    expect(payload.timestamp).toBeDefined();
  });

  it("log() works without metadata", () => {
    telemetry.log("NO_META");
    const firstCall = consoleLogSpy.mock.calls[0];
    if (!firstCall) throw new Error("console.log was not called");
    const call = firstCall[0] as string;
    const payload = JSON.parse(call.replace("[SOTA-TELEMETRY] ", ""));
    expect(payload.event).toBe("NO_META");
  });

  it("error() calls log with ERROR event and message", () => {
    telemetry.error("Something broke", new Error("detail"));
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleLogSpy.mock.calls[0];
    if (!firstCall) throw new Error("console.log was not called");
    const call = firstCall[0] as string;
    const payload = JSON.parse(call.replace("[SOTA-TELEMETRY] ", ""));
    expect(payload.event).toBe("ERROR");
    expect(payload.message).toBe("Something broke");
    expect(payload.error).toBeDefined();
  });

  it("error() handles non-Error second argument", () => {
    telemetry.error("Fail", "string error");
    const firstCall = consoleLogSpy.mock.calls[0];
    if (!firstCall) throw new Error("console.log was not called");
    const call = firstCall[0] as string;
    const payload = JSON.parse(call.replace("[SOTA-TELEMETRY] ", ""));
    expect(payload.error).toBe("string error");
  });
});
