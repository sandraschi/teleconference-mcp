"use client";

import { useRoomContext } from "@livekit/components-react";
import { type RemoteParticipant, RoomEvent } from "livekit-client";
import { ChevronRight, Monitor, Shield, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function RemoteAssistanceOverlay() {
  const room = useRoomContext();
  const [request, setRequest] = useState<{ reason: string; sender: string } | null>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data: { type?: string; reason?: string } = JSON.parse(text);

        if (data.type === "remote_request") {
          setRequest({ reason: data.reason ?? "", sender: participant?.identity || "Agent" });
        }
        // eslint-disable-next-line no-empty -- non-JSON packets belong to other features
      } catch {}
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const handleGrant = async () => {
    if (!id || !password || !room) return;
    setIsSending(true);

    const payload = JSON.stringify({
      type: "grant_native_access",
    });

    try {
      await room.localParticipant.publishData(new TextEncoder().encode(payload));
      setRequest(null);
      setId("");
      setPassword("");
    } catch (err) {
      console.error("Failed to send credentials:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl border border-blue-500/30 animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <ShieldAlert className="text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Active Remote Request</h3>
              <p className="text-xs text-blue-400/70 font-mono uppercase tracking-widest">
                {request.sender} is asking for control
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
            <p className="text-sm text-gray-300 leading-relaxed italic">&ldquo;{request.reason}&rdquo;</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5 flex items-center gap-3">
            <Monitor className="text-blue-400" size={20} />
            <div>
              <p className="text-sm font-semibold text-white">Full Native Control</p>
              <p className="text-[10px] text-gray-500 font-mono italic">
                Enables mouse/keyboard injection via SOTA Substrate.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={() => setRequest(null)}
              className="px-6 py-3 flex-1 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <X size={18} />
              Decline
            </button>
            <button
              type="button"
              onClick={handleGrant}
              disabled={isSending}
              className="px-6 py-3 flex-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Shield size={18} />
              )}
              Start Remoting
              <ChevronRight size={14} className="opacity-50" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-blue-500/5 border-t border-white/5 flex items-center gap-3">
          <Shield className="text-blue-400/50" size={14} />
          <p className="text-[10px] text-gray-500 font-mono italic">
            Secure handoff via encrypted data substrate. Antigravity Visio only.
          </p>
        </div>
      </div>
    </div>
  );
}
