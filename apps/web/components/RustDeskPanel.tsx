"use client";

import { ExternalLink, Info, Monitor } from "lucide-react";
import { useState } from "react";

interface RustDeskPanelProps {
  defaultUrl?: string;
}

export default function RustDeskPanel({ defaultUrl = "https://web.rustdesk.com/" }: RustDeskPanelProps) {
  const url = defaultUrl;
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-neutral-900/30">
      {/* Header / Config bar */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Remote Control</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-white/5 rounded transition-colors text-gray-500 hover:text-white"
            title="Open in new window"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Main Bridge Environment */}
      <div className="flex-1 relative bg-black">
        {!isIframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-neutral-950">
            <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-mono italic animate-pulse">Negotiating Remote Substrate...</p>
          </div>
        )}

        <iframe
          src={url}
          className="w-full h-full border-none"
          onLoad={() => setIsIframeLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
          allow="fullscreen; display-capture; autoplay"
          title="RustDesk Remote Control"
        />
      </div>

      {/* Footer / Context */}
      <div className="p-3 border-t border-white/5 bg-neutral-950/50">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-gray-600 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed font-mono">
            SOTA 2026: Remote control is bridged via sandboxed HTML5. Ensure remote target is running RustDesk and ID is
            known.
          </p>
        </div>
      </div>
    </div>
  );
}
