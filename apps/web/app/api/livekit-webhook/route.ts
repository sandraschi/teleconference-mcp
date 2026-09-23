import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

// LiveKit server webhooks (room_started/finished, participant joined/left,
// egress ready). Configure the URL in livekit.yaml and/or the LiveKit dashboard.
// Invalid signatures get 401; anything validated gets 200 + structured log.
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret =
    process.env.LIVEKIT_API_SECRET || "dev-secret-0123456789abcdef-0123456789abcdef";
  const authHeader = request.headers.get("authorization") ?? "";
  const body = await request.text();

  const receiver = new WebhookReceiver(apiKey, apiSecret);
  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const summary = {
    event: event.event,
    room: event.room?.name ?? null,
    participant: event.participant?.identity ?? null,
    egress: event.egressInfo?.egressId ?? null,
    at: new Date().toISOString(),
  };
  console.info(`[livekit-webhook] ${summary.event} room=${summary.room} participant=${summary.participant}`);
  return NextResponse.json({ received: true, ...summary });
}
