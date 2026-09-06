"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  Search,
  Rocket,
  Users,
  Keyboard,
  Bot,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          AG-Visio is a real-time voice conferencing system with an AI agent
          (Visio) that participates in conversations using a materialist and
          reductionist approach.
        </p>

        <h4 className="font-semibold text-white mt-4">Prerequisites</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>
            <strong className="text-gray-300">Docker</strong> - Required for
            LiveKit server and Redis
          </li>
          <li>
            <strong className="text-gray-300">Ollama</strong> - Local LLM
            runtime (with gemma2 or similar model)
          </li>
          <li>
            <strong className="text-gray-300">Python 3.11+</strong> - For the
            Visio agent
          </li>
          <li>
            <strong className="text-gray-300">Node.js 18+</strong> - For this
            web application
          </li>
        </ul>

        <h4 className="font-semibold text-white mt-4">Quick Start</h4>
        <div className="bg-neutral-800 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-2">
          <p className="text-gray-500"># 1. Start infrastructure</p>
          <p>docker compose up -d</p>
          <p className="text-gray-500 mt-2"># 2. Start Ollama with a model</p>
          <p>ollama run gemma2</p>
          <p className="text-gray-500 mt-2"># 3. Activate agent venv and run</p>
          <p>apps\agent\venv\Scripts\activate</p>
          <p>python apps/agent/agent.py dev</p>
          <p className="text-gray-500 mt-2"># 4. Open http://localhost:10800</p>
        </div>
      </div>
    ),
  },
  {
    id: "joining-room",
    title: "How to Join a Room",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          Joining a conference room is straightforward:
        </p>

        <ol className="list-decimal list-inside space-y-3 text-gray-400">
          <li>
            <strong className="text-gray-300">Enter your name</strong> in the
            input field on the dashboard
          </li>
          <li>
            <strong className="text-gray-300">
              Click &quot;Initialize Mode Cons&quot;
            </strong>{" "}
            to request a room token
          </li>
          <li>
            <strong className="text-gray-300">Allow camera/microphone</strong>{" "}
            when prompted by your browser
          </li>
          <li>
            <strong className="text-gray-300">You&apos;re connected!</strong> Other
            participants (including Visio) will appear in the grid
          </li>
        </ol>

        <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mt-4">
          <h5 className="font-semibold text-blue-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Important
          </h5>
          <p className="text-gray-400 text-sm mt-2">
            Make sure the LiveKit server is running (docker compose up -d)
            before attempting to join. If connection fails, check the browser
            console for errors.
          </p>
        </div>

        <h4 className="font-semibold text-white mt-4">Room Controls</h4>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-center gap-2">
            <span className="bg-neutral-700 px-2 py-1 rounded text-xs">
              Mic
            </span>
            Toggle your microphone on/off
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-neutral-700 px-2 py-1 rounded text-xs">
              Camera
            </span>
            Toggle your camera on/off
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-neutral-700 px-2 py-1 rounded text-xs">
              Screen
            </span>
            Share your screen with participants
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-neutral-700 px-2 py-1 rounded text-xs">
              Leave
            </span>
            Disconnect from the room
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    icon: Keyboard,
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          Navigate efficiently with these keyboard shortcuts:
        </p>

        <div className="grid gap-3">
          {[
            { key: "?", action: "Open this help modal" },
            { key: "Escape", action: "Close modal / Cancel action" },
            { key: "M", action: "Toggle microphone (when in room)" },
            { key: "V", action: "Toggle camera (when in room)" },
            { key: "S", action: "Toggle screen share (when in room)" },
          ].map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between bg-neutral-800 rounded-lg px-4 py-3"
            >
              <span className="text-gray-300">{shortcut.action}</span>
              <kbd className="bg-neutral-700 px-3 py-1 rounded text-sm font-mono text-gray-300">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "agent-behavior",
    title: "Visio Agent Behavior",
    icon: Bot,
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          Visio is an AI agent that participates in conferences with a
          materialist and reductionist philosophy. It monitors conversations
          and responds strategically.
        </p>

        <h4 className="font-semibold text-white mt-4">Core Principles</h4>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
            <span>
              <strong className="text-gray-300">Data is reality</strong> - Visio
              prioritizes empirical evidence over speculation
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
            <span>
              <strong className="text-gray-300">LDDO Detection</strong> - Rejects
              Low-Density Discourse Objects (corporate jargon, meaningless
              buzzwords)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
            <span>
              <strong className="text-gray-300">Strategic Silence</strong> -
              Remains quiet unless addressed directly or detecting high-entropy
              nonsense
            </span>
          </li>
        </ul>

        <h4 className="font-semibold text-white mt-4">When Visio Responds</h4>
        <div className="bg-neutral-800 rounded-lg p-4 space-y-2 text-gray-400">
          <p>
            1. When explicitly addressed (&quot;Visio, what do you think...&quot;)
          </p>
          <p>
            2. When jargon score exceeds threshold (synergy, paradigm, holistic,
            etc.)
          </p>
          <p>3. When detecting ontological drift in the conversation</p>
        </div>

        <h4 className="font-semibold text-white mt-4">Jargon Weights</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { word: "synergy", weight: "0.5" },
            { word: "paradigm", weight: "0.4" },
            { word: "vibes", weight: "0.8" },
            { word: "holistic", weight: "0.6" },
            { word: "alignment", weight: "0.3" },
            { word: "manifest", weight: "0.7" },
          ].map((item) => (
            <div
              key={item.word}
              className="flex justify-between bg-neutral-800 rounded px-3 py-2"
            >
              <span className="text-gray-300">{item.word}</span>
              <span className="text-red-400 font-mono">{item.weight}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: AlertTriangle,
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Common Issues</h4>

        <div className="space-y-4">
          <div className="bg-neutral-800 rounded-lg p-4">
            <h5 className="font-medium text-white">
              &quot;Connection failed&quot; when joining
            </h5>
            <ul className="mt-2 space-y-1 text-gray-400 text-sm">
              <li>- Verify LiveKit is running: docker compose ps</li>
              <li>- Check port 15580 is accessible</li>
              <li>- Ensure LIVEKIT_API_KEY matches livekit.yaml</li>
            </ul>
          </div>

          <div className="bg-neutral-800 rounded-lg p-4">
            <h5 className="font-medium text-white">
              Visio agent not joining the room
            </h5>
            <ul className="mt-2 space-y-1 text-gray-400 text-sm">
              <li>- Verify Ollama is running with a model loaded</li>
              <li>- Check agent logs: python apps/agent/agent.py dev</li>
              <li>- Ensure room name matches between web and agent</li>
            </ul>
          </div>

          <div className="bg-neutral-800 rounded-lg p-4">
            <h5 className="font-medium text-white">No audio/video</h5>
            <ul className="mt-2 space-y-1 text-gray-400 text-sm">
              <li>- Check browser permissions for camera/microphone</li>
              <li>- Try a different browser (Chrome recommended)</li>
              <li>- Verify devices in Settings page</li>
            </ul>
          </div>

          <div className="bg-neutral-800 rounded-lg p-4">
            <h5 className="font-medium text-white">Transcriptions not appearing</h5>
            <ul className="mt-2 space-y-1 text-gray-400 text-sm">
              <li>- Agent must be connected and publishing data</li>
              <li>- Check agent logs for transcription events</li>
              <li>- Verify Whisper STT is properly initialized</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-blue-400">
          <ExternalLink className="w-4 h-4" />
          <a
            href="https://docs.livekit.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
          >
            LiveKit Documentation
          </a>
        </div>
      </div>
    ),
  },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState(helpSections[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = helpSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === ""
  );

  const currentSection = helpSections.find((s) => s.id === activeSection);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help & Documentation" size="xl">
      <div className="flex min-h-[500px]">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-800 p-4 flex-shrink-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Section List */}
          <nav className="space-y-1">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-neutral-800 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {section.title}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentSection && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <currentSection.icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {currentSection.title}
                </h3>
              </div>
              {currentSection.content}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
