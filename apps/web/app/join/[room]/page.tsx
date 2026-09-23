"use client";

import { ControlBar, LiveKitRoom, ParticipantTile, useTracks } from "@livekit/components-react";
import { Loader2, Monitor } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { DEFAULT_LIVEKIT_URL } from "@/lib/settings";

export default function GuestJoinPage() {
  const params = useParams();
  const roomName = typeof params.room === "string" ? params.room : "ag-visio-conference";
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || DEFAULT_LIVEKIT_URL;

  useEffect(() => {
    document.title = `Join ${roomName} — AG-Visio`;
  }, [roomName]);

  const handleJoin = async () => {
    const displayName = name.trim() || `Guest_${Math.random().toString(36).slice(2, 7)}`;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, participantName: displayName }),
      });
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
      } else if (data.token) {
        setToken(data.token);
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (token) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        video={true}
        audio={true}
        onDisconnected={() => setToken(null)}
        data-lk-theme="default"
        style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}
      >
        <div className="flex-1 p-4 overflow-y-auto">
          <GuestGrid />
        </div>
        <div className="p-2 glass-panel rounded-2xl mx-4 mb-4">
          <ControlBar
            controls={{ microphone: true, camera: true, leave: true, screenShare: true }}
            variation="verbose"
          />
        </div>
        <div className="text-center text-[10px] text-gray-600 pb-2">
          Room: {roomName} &middot;{" "}
          <button type="button" onClick={() => setToken(null)} className="underline">
            Leave
          </button>
        </div>
      </LiveKitRoom>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full glass-panel rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <Monitor className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-white">Join Meeting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Room: <code className="text-blue-400">{roomName}</code>
          </p>
        </div>

        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          // biome-ignore lint/a11y/noAutofocus: primary CTA input
          autoFocus
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="button"
          onClick={handleJoin}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Join Now
        </button>

        <p className="text-xs text-gray-600 text-center">
          <Link href="/" className="text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

function GuestGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {tracks.map((track) => (
        <div
          key={track.participant.identity + track.source}
          className="aspect-video bg-neutral-900 rounded-xl overflow-hidden"
        >
          <ParticipantTile trackRef={track} />
        </div>
      ))}
    </div>
  );
}
