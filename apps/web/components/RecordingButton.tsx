"use client";

import { useRoomContext } from "@livekit/components-react";
import { Circle, Loader2, Square } from "lucide-react";
import { useCallback, useState } from "react";

export default function RecordingButton() {
  const room = useRoomContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (isRecording) {
        // Stop recording via LiveKit Server API
        await fetch("/api/egress/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_name: room.name }),
        });
        setIsRecording(false);
      } else {
        // Start recording via LiveKit Server API
        const res = await fetch("/api/egress/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_name: room.name }),
        });
        if (res.ok) setIsRecording(true);
      }
    } catch {
      // silently fail
    } finally {
      setIsToggling(false);
    }
  }, [isRecording, isToggling, room.name]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isToggling}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isRecording
          ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
          : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
      } disabled:opacity-50`}
      title={isRecording ? "Stop recording" : "Start recording"}
    >
      {isToggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <Square className="w-4 h-4" />
      ) : (
        <Circle className="w-4 h-4 text-red-400" />
      )}
      <span className="hidden sm:inline">{isRecording ? "Stop Rec" : "Record"}</span>
    </button>
  );
}
