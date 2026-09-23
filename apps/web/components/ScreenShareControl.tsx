"use client";

import { useCallback } from "react";
import { Monitor, MonitorOff } from "lucide-react";
import { useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function ScreenShareControl() {
  const room = useRoomContext();

  const isSharing = Array.from(room.localParticipant?.trackPublications.values() ?? []).some(
    (pub) => pub.source === Track.Source.ScreenShare
  );

  const handleClick = useCallback(async () => {
    try {
      if (isSharing) {
        for (const pub of room.localParticipant?.trackPublications.values() ?? []) {
          if (pub.source === Track.Source.ScreenShare) {
            pub.track?.stop();
            if (pub.track) await room.localParticipant?.unpublishTrack(pub.track);
          }
        }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const mediaTrack = stream.getVideoTracks()[0];
        if (!mediaTrack) return;
        await room.localParticipant?.publishTrack(mediaTrack, {
          source: Track.Source.ScreenShare,
        });
        mediaTrack.onended = () => {};
      }
    } catch {
      // user cancelled or error
    }
  }, [isSharing, room]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isSharing
          ? "bg-green-600 text-white hover:bg-green-700"
          : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
      }`}
      title={isSharing ? "Stop sharing screen" : "Share screen"}
    >
      {isSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
      <span className="hidden sm:inline">{isSharing ? "Stop Share" : "Share Screen"}</span>
    </button>
  );
}
