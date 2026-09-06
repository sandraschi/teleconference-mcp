import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { livekitApiKey, livekitApiSecret } from "@/lib/livekit-server";

const FALLBACK_PORT = 15580; // fleet SFU port (upstream LiveKit default is 7880);
const DEFAULT_ROOMS = [
  "ag-visio-conference",
  "development",
  "testing",
  "demo",
];

function isLocalOrPrivate(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
  return false;
}

function getLiveKitHost(request: NextRequest): string {
  const env = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (env) return env;
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded || request.headers.get("host") || "localhost";
  const hostname = host.split(":")[0] ?? "localhost";
  const protocol = isLocalOrPrivate(hostname) ? "ws" : "wss";
  return `${protocol}://${hostname}:${FALLBACK_PORT}`;
}

function toHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^wss?:\/\//, "http://");
}

export async function GET(request: NextRequest) {
  try {
    const livekitUrl = getLiveKitHost(request);
    const httpUrl = toHttpUrl(livekitUrl);
    const apiKey = livekitApiKey();
    const apiSecret = livekitApiSecret();

    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const activeRooms = await roomService.listRooms();

    const activeNames = activeRooms.map((r) => r.name);
    const suggestedRooms = [
      ...new Set([...DEFAULT_ROOMS, ...activeNames]),
    ];

    return NextResponse.json({
      livekitUrl,
      rooms: activeRooms.map((r) => ({
        name: r.name,
        participantCount: r.numParticipants,
        metadata: r.metadata,
      })),
      suggestedRooms,
    });
  } catch (error) {
    console.error("Discovery error:", error);
    const livekitUrl = getLiveKitHost(request);
    return NextResponse.json({
      livekitUrl,
      rooms: [],
      suggestedRooms: DEFAULT_ROOMS,
      error: "Could not reach LiveKit server",
    });
  }
}
