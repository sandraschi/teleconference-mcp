import { NextRequest, NextResponse } from "next/server";
import { EgressClient, EncodedFileOutput, EncodedFileType, RoomServiceClient } from "livekit-server-sdk";
import { livekitApiKey, livekitApiSecret, livekitHttpUrl } from "@/lib/livekit-server";

const url = () => livekitHttpUrl();
const key = () => livekitApiKey();
const secret = () => livekitApiSecret();

export async function POST(request: NextRequest) {
  try {
    const { room_name } = (await request.json()) as { room_name?: string };
    const roomName = room_name?.trim();
    if (!roomName) return NextResponse.json({ error: "room_name required" }, { status: 400 });
    const rooms = await new RoomServiceClient(url(), key(), secret()).listRooms();
    if (!rooms.some((r) => r.name === roomName))
      return NextResponse.json({ error: `Room "${roomName}" not found` }, { status: 404 });
    try {
      const info = await new EgressClient(url(), key(), secret()).startRoomCompositeEgress(
        roomName,
        new EncodedFileOutput({
          fileType: EncodedFileType.MP4,
          filepath: `recordings/${roomName}-{time}.mp4`,
        })
      );
      return NextResponse.json({ status: "recording_started", room_name: roomName, egress_id: info.egressId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `Egress start failed: ${msg}. Configure file/S3 output on the LiveKit server.` },
        { status: 502 }
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
