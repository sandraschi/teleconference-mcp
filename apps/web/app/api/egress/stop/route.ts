import { NextRequest, NextResponse } from "next/server";
import { EgressClient } from "livekit-server-sdk";
import { livekitApiKey, livekitApiSecret, livekitHttpUrl } from "@/lib/livekit-server";

export async function POST(request: NextRequest) {
  try {
    const { room_name } = (await request.json()) as { room_name?: string };
    const roomName = room_name?.trim();
    if (!roomName) return NextResponse.json({ error: "room_name required" }, { status: 400 });
    const egress = new EgressClient(livekitHttpUrl(), livekitApiKey(), livekitApiSecret());
    const active = await egress.listEgress({ roomName });
    const stopped: string[] = [];
    for (const e of active.filter((x) => x.status <= 2)) {
      try {
        await egress.stopEgress(e.egressId);
        stopped.push(e.egressId);
      } catch {
        // already finished between list and stop
      }
    }
    return NextResponse.json({ status: "recording_stopped", room_name: roomName, stopped });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
