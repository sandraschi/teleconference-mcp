export const telemetry = {
  log: (event: string, metadata?: unknown) => {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      event,
      ...((metadata as Record<string, unknown>) || {}),
      context: "AG-Visio-SOTA-Web",
    };
    console.log(`[SOTA-TELEMETRY] ${JSON.stringify(payload)}`);
    // In a production scenario, this would POST to a logging sink
  },
  error: (message: string, error?: unknown) => {
    telemetry.log("ERROR", { message, error: (error as Error)?.message || error });
  },
};
