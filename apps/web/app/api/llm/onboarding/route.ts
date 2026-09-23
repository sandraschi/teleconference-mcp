import { NextResponse } from "next/server";

// Fresh-install starter facts for the under-hero onboarding cue.
// Static by design (no secrets, no live probing); clients call this on mount.
export async function GET() {
  return NextResponse.json({
    facts: [
      "Join a room from the dashboard - no account needed, everything is self-hosted.",
      "Local AI runs on Ollama (free). Cloud voices need provider keys in Settings.",
      "LiveKit media runs as a native service; never start a second one in Docker.",
    ],
    recommended_path: "/",
    docs: "/docs/ONBOARDING.md",
  });
}
