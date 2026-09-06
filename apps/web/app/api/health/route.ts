import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

const FALLBACK_PORT = 15580; // fleet SFU port (upstream LiveKit default is 7880)

function livekitWsUrl(request: NextRequest): string {
  const env = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (env) return env;
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded || request.headers.get("host") || "localhost";
  const hostname = host.split(":")[0] ?? "localhost";
  return `ws://${hostname}:${FALLBACK_PORT}`;
}

function getLiveKitHttpUrl(request: NextRequest): string {
  return livekitWsUrl(request).replace(/^wss?:\/\//, "http://");
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  const httpUrl = getLiveKitHttpUrl(request);

  try {
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const rooms = await roomService.listRooms();
    return NextResponse.json({
      status: "ok",
      livekit: { reachable: true, roomCount: rooms.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        livekit: { reachable: false, error: String(error) },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
