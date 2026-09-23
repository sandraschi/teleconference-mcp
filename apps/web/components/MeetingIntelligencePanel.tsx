"use client";

import type { Room } from "livekit-client";
import { Brain, FileText, ListTodo, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface IntelligenceItem {
  type: "summary" | "action_items";
  content: string;
  timestamp: string;
}

export const MeetingIntelligencePanel = ({ room }: { room: Room }) => {
  const [items, setItems] = useState<IntelligenceItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const onDataReceived = (payload: Uint8Array) => {
      const str = new TextDecoder().decode(payload);
      try {
        const data = JSON.parse(str);
        if (data.type === "intelligence_update") {
          setItems((prev) => [
            {
              type: data.intelligence_type,
              content: data.content,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
          setIsAnalyzing(false);
        } else if (data.type === "intelligence_busy") {
          setIsAnalyzing(true);
        }
        // eslint-disable-next-line no-empty -- non-JSON packets belong to other features
      } catch {}
    };

    room.on("dataReceived", onDataReceived);
    return () => {
      room.off("dataReceived", onDataReceived);
    };
  }, [room]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md border-l border-slate-700/50 text-slate-200">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="font-semibold tracking-tight">Meeting Intelligence</h2>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-1 text-xs text-indigo-400">
            <Zap className="w-3 h-3 animate-bounce" />
            <span>AI Thinking...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 opacity-70">
            <Brain className="w-12 h-12 mb-2" />
            <p className="text-sm">No intelligence captured yet.</p>
            <p className="text-xs text-center px-4">Visio is listening for key insights and action items.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.timestamp}-${item.type}-${item.content.length}`}
              className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 shadow-xl transition-all hover:scale-[1.02] hover:bg-slate-800"
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wider text-indigo-300">
                {item.type === "summary" ? <FileText className="w-3 h-3" /> : <ListTodo className="w-3 h-3" />}
                <span>{item.type.replace("_", " ")}</span>
                <span className="ml-auto text-slate-300 font-normal">{item.timestamp}</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">{item.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-700/50 bg-slate-950/30">
        <button
          type="button"
          onClick={() => {
            // Trigger manual intelligence pull if needed
            room.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({ type: "request_intelligence" })),
              { reliable: true },
            );
          }}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          Force AI Insight
        </button>
      </div>
    </div>
  );
};
