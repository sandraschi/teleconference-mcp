import { NextRequest, NextResponse } from "next/server";
import { EgressClient, EncodedFileType, RoomServiceClient } from "livekit-server-sdk";

function baseUrl(): string {
  const url =
    process.env.LIVEKIT_URL?.replace("ws://", "http://").replace("wss://", "https://") ??
    "http://localhost:15580";
  return url;
}

function roomClient(): RoomServiceClient {
  return new RoomServiceClient(
    baseUrl(),
    process.env.LIVEKIT_API_KEY || "devkey",
    process.env.LIVEKIT_API_SECRET || "secret"
  );
}

function egressClient(): EgressClient {
  return new EgressClient(
    baseUrl(),
    process.env.LIVEKIT_API_KEY || "devkey",
    process.env.LIVEKIT_API_SECRET || "secret"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { room_name?: string; action?: string };
    const roomName = body.room_name?.trim();
    if (!roomName) {
      return NextResponse.json({ error: "room_name required" }, { status: 400 });
    }
    const path = request.nextUrl.pathname;
    const action = body.action ?? (path.endsWith("/stop") ? "stop" : "start");

    if (action === "stop") {
      const egress = egressClient();
      const active = await egress.listEgress({ roomName });
      const running = active.filter((e) => e.status <= 2);
      const stopped: string[] = [];
      for (const e of running) {
        try {
          await egress.stopEgress(e.egressId);
          stopped.push(e.egressId);
        } catch {
          // best-effort: egress may have finished between list and stop
        }
      }
      return NextResponse.json({ status: "recording_stopped", room_name: roomName, stopped });
    }

    // start — Egress v2 (server v1.13.2+): RoomComposite with MP4 file output.
    // Requires file/S3 output configured server-side; without it LiveKit
    // returns a clear error instead of a fake success (pre-2.3 stub bug).
    const rooms = await roomClient().listRooms();
    if (!rooms.some((r) => r.name === roomName)) {
      return NextResponse.json({ error: `Room "${roomName}" not found` }, { status: 404 });
    }
    try {
      const info = await egressClient().createRoomCompositeEgress(roomName, {
        fileOutputs: [
          {
            fileType: EncodedFileType.MP4,
            filepath: `recordings/${roomName}-{time}.mp4`,
          },
        ],
      });
      return NextResponse.json({
        status: "recording_started",
        room_name: roomName,
        egress_id: info.egressId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: `Egress start failed: ${msg}. Configure file/S3 output on the LiveKit server.`,
        },
        { status: 502 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("type") === "recordings") {
      try {
        const list = await egressClient().listEgress();
        return NextResponse.json({
          recordings: list.map((e) => ({
            id: e.egressId,
            room_name: e.roomName,
            started_at: new Date(Number(e.startedAt) / 1_000_000).toISOString(),
            duration_sec: Math.max(
              0,
              Math.round((Number(e.endedAt || BigInt(Date.now() * 1_000_000)) - Number(e.startedAt)) / 1_000_000_000)
            ),
            status: e.status === 3 ? "completed" : e.status >= 4 ? "failed" : "recording",
            url: e.fileResults?.[0]?.location,
          })),
        });
      } catch (e) {
        return NextResponse.json({
          recordings: [],
          message: `Egress list failed: ${e instanceof Error ? e.message : String(e)}. Egress storage must be configured on the LiveKit server.`,
        });
      }
    }

    const rooms = await roomClient().listRooms();
    return NextResponse.json({
      rooms: rooms.map((r) => ({
        name: r.name,
        num_participants: r.numParticipants,
        creation_time: r.creationTime,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
