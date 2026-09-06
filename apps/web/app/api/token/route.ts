import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { livekitApiKey, livekitApiSecret } from "@/lib/livekit-server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = process.env.AUTH_DISABLED === "true" ? null : await auth();
    const { roomName, participantName } = await request.json() as {
      roomName?: string;
      participantName?: string;
    };

    if (!roomName || !roomName.trim()) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    // Use authenticated identity, fall back to provided name for guest-join scenarios
    const identity = session?.user?.id || session?.user?.email || participantName?.trim();
    if (!identity) {
      return NextResponse.json({ error: "Could not determine identity" }, { status: 400 });
    }

  const apiKey = livekitApiKey();
  const apiSecret = livekitApiSecret();

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: session?.user?.name || identity,
      metadata: JSON.stringify({
        auth_provider: session ? "authentik" : "anonymous",
        email: session?.user?.email,
      }),
    });

    at.addGrant({
      roomJoin: true,
      roomCreate: true, // v1.12+: auto-create room on first join, no room_create call needed
      room: roomName.trim(),
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({ token: at.toJwt() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token generation failed" },
      { status: 500 }
    );
  }
}
