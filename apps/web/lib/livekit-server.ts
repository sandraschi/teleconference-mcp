/**
 * Server-side LiveKit credentials — single source of truth for API routes.
 *
 * The dev default MUST match `keys:` in livekit.yaml
 * (`devkey: dev-secret-...`). Real deployments override via
 * LIVEKIT_API_KEY / LIVEKIT_API_SECRET env vars. Never import this
 * module (or these values) into client components.
 */

const DEV_KEY = "devkey";
const DEV_SECRET = "dev-secret-0123456789abcdef-0123456789abcdef";

export function livekitApiKey(): string {
  return process.env.LIVEKIT_API_KEY || DEV_KEY;
}

export function livekitApiSecret(): string {
  return process.env.LIVEKIT_API_SECRET || DEV_SECRET;
}

export function livekitHttpUrl(): string {
  const ws =
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "ws://localhost:15580";
  return ws.replace(/^wss?:\/\//, "http://");
}
