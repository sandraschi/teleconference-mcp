"use client";

import { useRoomContext } from "@livekit/components-react";
import type React from "react";
import { useEffect, useState } from "react";

interface AgentState {
  identity: string;
  ocr?: string;
  status: "active" | "idle";
  lastUpdate: number;
}

export const AgentFleetPanel: React.FC = () => {
  const room = useRoomContext();
  const [fleet, setFleet] = useState<Record<string, AgentState>>({});

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "fleet_update") {
          setFleet((prev) => ({
            ...prev,
            [data.agent]: {
              identity: data.agent,
              ocr: data.ocr,
              status: "active",
              lastUpdate: Date.now(),
            },
          }));
        }
      } catch (e) {
        console.error("Failed to parse fleet update", e);
      }
    };

    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room]);

  const agents = Object.values(fleet);

  return (
    <div className="agent-fleet-panel p-4 bg-gray-900/50 backdrop-blur-md rounded-lg border border-white/10">
      <h3 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-widest">Agent Fleet Substrate</h3>
      <div className="space-y-4">
        {agents.length === 0 && <p className="text-xs text-gray-400 italic">No peer agents detected in fleet...</p>}
        {agents.map((agent) => (
          <div key={agent.identity} className="agent-card bg-black/30 p-3 rounded border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-white">{agent.identity}</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            {agent.ocr && (
              <div className="ocr-log mt-2">
                <span className="text-[10px] text-blue-300 font-bold block mb-1">OCR ANALYSIS:</span>
                <p className="text-[10px] text-gray-300 font-mono leading-relaxed bg-black/50 p-2 rounded">
                  {agent.ocr}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
