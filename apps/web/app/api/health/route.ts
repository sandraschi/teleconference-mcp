import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { livekitApiKey, livekitApiSecret, livekitHttpUrl } from "@/lib/livekit-server";

export async function GET() {
  const roomService = new RoomServiceClient(
    livekitHttpUrl(),
    livekitApiKey(),
    livekitApiSecret()
  );
  try {
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
