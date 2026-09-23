"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@livekit/components-react";
import { MessageSquare, Send } from "lucide-react";

export default function ChatPanel() {
  const { chatMessages, send, isSending } = useChat();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isSending) return;
    const text = input.value.trim();
    input.value = "";
    await send(text);
    input.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-700">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Chat
        </span>
      </div>
      <ul
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 font-mono text-sm"
      >
        {chatMessages.length === 0 && (
          <li className="text-gray-400 text-center py-4">
            No messages yet. Say hello!
          </li>
        )}
        {chatMessages.map((msg) => (
          <li key={msg.id ?? msg.timestamp} className="break-words">
            <span className="text-blue-400 font-medium">
              {msg.from?.identity ?? "Unknown"}:
            </span>{" "}
            <span className="text-gray-300">{msg.message}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-gray-700 flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
