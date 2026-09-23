"use client";

import { ControlBar, LiveKitRoom, ParticipantTile, useRoomContext, useTracks } from "@livekit/components-react";
import "@livekit/components-styles";
import { type Participant, RoomEvent, Track, type TranscriptionSegment } from "livekit-client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AgentFleetPanel } from "@/components/AgentFleetPanel";
import AgentStatus from "@/components/AgentStatus";
import BackgroundBlurToggle from "@/components/BackgroundBlurToggle";
import ChatPanel from "@/components/ChatPanel";
import ContactPanel from "@/components/ContactPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import FileSharingPanel from "@/components/FileSharingPanel";
import { LlmOnboarding } from "@/components/LlmOnboarding";
import LogViewer from "@/components/LogViewer";
import { MeetingIntelligencePanel } from "@/components/MeetingIntelligencePanel";
import ReconnectionBanner from "@/components/ReconnectionBanner";
import RecordingButton from "@/components/RecordingButton";
import RemoteAssistanceOverlay from "@/components/RemoteAssistanceOverlay";
import RustDeskPanel from "@/components/RustDeskPanel";
import ScreenShareControl from "@/components/ScreenShareControl";
import Topbar from "@/components/Topbar";
import { useDiscovery } from "@/lib/discovery";
import { usePreJoinValidation } from "@/lib/prejoin-validation";
import { DEFAULT_LIVEKIT_URL, useSettings } from "@/lib/settings";
import { telemetry } from "@/lib/telemetry";

interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: string;
  text: string;
}

export default function ModConsDashboard() {
  const { settings, isLoaded } = useSettings();
  const { livekitUrl: discoveredUrl, suggestedRooms, rooms: discoveryRooms, discoveryError } = useDiscovery(30000);
  const [token, setToken] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [currentRoom, setCurrentRoom] = useState(settings.defaultRoomName);
  const [customRoomName, setCustomRoomName] = useState("");
  const [useCustomRoom, setUseCustomRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<
    "transcript" | "chat" | "remote" | "fleet" | "files" | "contacts" | "intelligence"
  >("intelligence");
  const [focusedTrackSid, setFocusedTrackSid] = useState<string | null>(null);
  const hasAppliedRoomParam = useRef(false);
  const deviceValidation = usePreJoinValidation(settings);

  const livekitUrl = discoveredUrl ?? settings.livekitUrl ?? DEFAULT_LIVEKIT_URL;

  useEffect(() => {
    setCurrentRoom(settings.defaultRoomName);
  }, [settings.defaultRoomName]);

  useEffect(() => {
    if (hasAppliedRoomParam.current) return;
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const roomParam = params.get("room");
    if (roomParam) {
      hasAppliedRoomParam.current = true;
      const inSuggested = suggestedRooms.includes(roomParam);
      if (inSuggested) setCurrentRoom(roomParam);
      else {
        setUseCustomRoom(true);
        setCustomRoomName(roomParam);
        setCurrentRoom(roomParam);
      }
    }
  }, [suggestedRooms]);

  useEffect(() => {
    telemetry.log("DASHBOARD_MOUNTED");
    return () => telemetry.log("DASHBOARD_UNMOUNTED");
  }, []);

  const effectiveRoom = useCustomRoom ? customRoomName.trim() : currentRoom;

  const handleInit = async (roomToJoin?: string) => {
    const room = roomToJoin ?? effectiveRoom;
    if (!participantName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (useCustomRoom && !customRoomName.trim()) {
      setError("Please enter a room name");
      return;
    }
    setError(null);
    setIsLoading(true);
    telemetry.log("MOD_CONS_INIT_REQUESTED", { participant: participantName, room: roomToJoin });

    try {
      const resp = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: room,
          participantName: participantName.trim(),
        }),
      });
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
        telemetry.log("TOKEN_FETCH_FAILED", { error: data.error });
      } else if (data.token) {
        setToken(data.token);
        setCurrentRoom(room);
        if (useCustomRoom) setUseCustomRoom(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      telemetry.log("TOKEN_FETCH_FAILED", { error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomChange = async (newRoom: string) => {
    if (newRoom === currentRoom) return;

    telemetry.log("ROOM_SWITCH_REQUESTED", { from: currentRoom, to: newRoom });
    setToken(null); // Disconnect from current room
    await handleInit(newRoom); // Reconnect to new room
  };

  const handleLogout = () => {
    setToken(null);
    setParticipantName("");
    telemetry.log("USER_LOGOUT");
  };

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col bg-transparent">
        {/* Topbar */}
        <Topbar
          userName={token ? participantName : undefined}
          currentRoom={currentRoom}
          isConnected={!!token}
          onHelpClick={() => {
            const event = new KeyboardEvent("keydown", { key: "?" });
            document.dispatchEvent(event);
          }}
          onLoggerClick={() => setIsLogViewerOpen(true)}
          onContactsClick={() => setRightPanelTab("contacts")}
          onRoomChange={handleRoomChange}
          onLogout={handleLogout}
          availableRooms={
            suggestedRooms.length > 0
              ? [...new Set([currentRoom, ...suggestedRooms])]
              : ["ag-visio-conference", "development", "testing", "demo"]
          }
          roomsWithCount={discoveryRooms}
        />

        <div className="dashboard-container">
          {token ? (
            <LiveKitRoom
              video={settings.preferredVideoInput ? { deviceId: { ideal: settings.preferredVideoInput } } : true}
              audio={settings.preferredAudioInput ? { deviceId: { ideal: settings.preferredAudioInput } } : true}
              token={token}
              serverUrl={livekitUrl}
              onDisconnected={() => {
                setToken(null);
                telemetry.log("ROOM_DISCONNECTED");
              }}
              onConnected={() => telemetry.log("ROOM_CONNECTED", { room: currentRoom })}
              onError={(e) => {
                telemetry.log("ROOM_CONNECTION_FAILED", { error: e?.message });
              }}
              data-lk-theme="default"
              style={{ height: "100%", width: "100%", display: "flex", flexDirection: "row" }}
            >
              <RemoteAssistanceOverlay />
              <div className="relative flex-1 p-4 overflow-y-auto flex flex-col min-w-0">
                <ReconnectionBanner />
                <div className="flex items-center justify-between gap-2 mb-4">
                  <AgentStatus />
                </div>
                <div className="flex-1 min-h-0">
                  <ModConsGrid
                    focusedTrackSid={focusedTrackSid}
                    onTrackFocus={(sid) => setFocusedTrackSid(sid === focusedTrackSid ? null : sid)}
                  />
                </div>
                <div className="mt-4 p-2 glass-panel rounded-2xl">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <ControlBar
                      controls={{
                        microphone: true,
                        camera: true,
                        screenShare: true,
                        chat: false,
                        leave: true,
                      }}
                      variation="verbose"
                    />
                    <ScreenShareControl />
                    <RecordingButton />
                    <BackgroundBlurToggle />
                  </div>
                </div>
              </div>
              {/* Right sidebar: collapsible on mobile */}
              <aside className="w-80 max-lg:w-full max-lg:max-h-80 border-l border-white/5 glass-panel flex flex-col shrink-0 m-2 rounded-2xl overflow-hidden">
                <div className="flex border-b border-gray-800">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("transcript")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "transcript"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Transcript
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("remote")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "remote"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Remote
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("fleet")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "fleet"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Fleet
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("files")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "files"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Files
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("chat")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "chat"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("contacts")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "contacts"
                        ? "bg-neutral-800 text-white border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Contacts
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("intelligence")}
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      rightPanelTab === "intelligence"
                        ? "bg-neutral-800 text-white border-b-2 border-indigo-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Intelligence
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {rightPanelTab === "transcript" ? (
                    <div className="h-full p-4 overflow-hidden">
                      <TranscriptionFeed />
                    </div>
                  ) : rightPanelTab === "chat" ? (
                    <ChatPanel />
                  ) : rightPanelTab === "remote" ? (
                    <RustDeskPanel />
                  ) : rightPanelTab === "fleet" ? (
                    <div className="h-full p-4 overflow-y-auto">
                      <AgentFleetPanel />
                    </div>
                  ) : rightPanelTab === "files" ? (
                    <FileSharingPanel />
                  ) : rightPanelTab === "intelligence" ? (
                    <IntelligenceTab />
                  ) : (
                    <div className="h-full p-2">
                      <ContactPanel />
                    </div>
                  )}
                </div>
              </aside>
            </LiveKitRoom>
          ) : (
            <>
              <div className="relative flex-1 p-4 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 w-full max-w-md p-8 glass-panel rounded-3xl animate-glow">
                  <div className="text-center" data-testid="dashboard-hero">
                    <h1 className="text-2xl font-bold text-white mb-1">AG-Visio Conference</h1>
                    <p className="text-gray-400 text-sm" data-testid="dashboard-subtitle">
                      Self-hosted video conferencing with AI assistance — pick a room below, or browse{" "}
                      <a className="text-blue-400 hover:text-blue-300" href="/tools">
                        MCP tools
                      </a>
                      ,{" "}
                      <a className="text-blue-400 hover:text-blue-300" href="/schedule">
                        schedule
                      </a>{" "}
                      and{" "}
                      <a className="text-blue-400 hover:text-blue-300" href="/health">
                        system health
                      </a>
                      .
                    </p>
                    <div className="mt-4 text-left">
                      <LlmOnboarding mode="banner" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Join Conference</h2>
                    <p className="text-gray-400 text-sm">Enter your name to join the AG-Visio conference room</p>
                  </div>

                  <div className="w-full space-y-4">
                    <div>
                      <label htmlFor="room-select" className="block text-sm text-gray-400 mb-1">
                        Room
                      </label>
                      <select
                        id="room-select"
                        data-testid="room-select"
                        value={useCustomRoom ? "__custom__" : currentRoom}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setUseCustomRoom(true);
                          } else {
                            setUseCustomRoom(false);
                            setCurrentRoom(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                        title="Select Room"
                      >
                        {(suggestedRooms.length > 0
                          ? [...new Set([currentRoom, ...suggestedRooms])]
                          : ["ag-visio-conference", "development", "testing", "demo"]
                        ).map((room) => (
                          <option key={room} value={room}>
                            {room}
                          </option>
                        ))}
                        <option value="__custom__">Create custom room...</option>
                      </select>
                      {useCustomRoom && (
                        <input
                          type="text"
                          placeholder="Enter room name"
                          value={customRoomName}
                          onChange={(e) => setCustomRoomName(e.target.value)}
                          className="mt-2 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                        />
                      )}
                    </div>
                    <div>
                      <label htmlFor="join-name" className="block text-sm text-gray-400 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        data-testid="join-name"
                        id="join-name"
                        placeholder="Enter your name"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInit()}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                        disabled={isLoading}
                        // biome-ignore lint/a11y/noAutofocus: primary CTA input, the point of this form
                        autoFocus
                      />
                    </div>

                    <div className="text-xs text-gray-400 bg-neutral-800/50 rounded-lg p-3 space-y-1">
                      <p>
                        <strong className="text-gray-400">Server:</strong> {livekitUrl}
                      </p>
                      {discoveryError && <p className="text-yellow-500">Using fallback (LiveKit unreachable)</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span>
                          Camera: {deviceValidation.camera === "ok" && <span className="text-green-500">OK</span>}
                          {deviceValidation.camera === "fail" && <span className="text-red-500">Fail</span>}
                          {deviceValidation.camera === "pending" && <span className="text-gray-400">Checking...</span>}
                        </span>
                        <span>
                          Mic: {deviceValidation.microphone === "ok" && <span className="text-green-500">OK</span>}
                          {deviceValidation.microphone === "fail" && <span className="text-red-500">Fail</span>}
                          {deviceValidation.microphone === "pending" && (
                            <span className="text-gray-400">Checking...</span>
                          )}
                        </span>
                        {(deviceValidation.camera === "fail" || deviceValidation.microphone === "fail") && (
                          <button
                            type="button"
                            onClick={() => deviceValidation.revalidate()}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                      {deviceValidation.error && <p className="text-red-400 mt-1">{deviceValidation.error}</p>}
                    </div>

                    {error && (
                      <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid="join-submit"
                      onClick={() => handleInit()}
                      disabled={isLoading}
                      className="w-full px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Join Room"
                      )}
                    </button>

                    <a
                      href="/test"
                      className="block w-full px-6 py-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition text-center font-medium text-gray-300"
                    >
                      Test Camera & Audio
                    </a>
                  </div>

                  <p className="text-xs text-gray-400">
                    Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-gray-400">?</kbd> for help
                  </p>
                </div>
              </div>
              <aside className="w-80 max-lg:w-full max-lg:hidden border-l border-gray-800 bg-neutral-900/50 flex flex-col items-center justify-center">
                <p className="text-gray-500 text-sm text-center px-4">
                  Join room to see
                  <br />
                  transcript and chat
                </p>
              </aside>
            </>
          )}
        </div>

        {/* Log Viewer Modal */}
        <LogViewer isOpen={isLogViewerOpen} onClose={() => setIsLogViewerOpen(false)} />
      </div>
    </ErrorBoundary>
  );
}

function IntelligenceTab() {
  // Hook runs unconditionally in its own component (rules-of-hooks).
  const room = useRoomContext();
  return <MeetingIntelligencePanel room={room} />;
}

function ModConsGrid({
  focusedTrackSid,
  onTrackFocus,
}: {
  focusedTrackSid: string | null;
  onTrackFocus: (sid: string) => void;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const screenShareTracks = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  // Automatic Focus Selection: If no manual focus, pick the first screen share
  // When user explicitly releases focus (focusedTrackSid set to null), don't re-auto-focus
  const hasScreenShares = screenShareTracks.length > 0;
  const effectiveFocusSid =
    focusedTrackSid !== null
      ? (focusedTrackSid ?? (hasScreenShares ? screenShareTracks[0]?.publication?.trackSid : null))
      : null;
  const focusedTrack = effectiveFocusSid ? tracks.find((t) => t.publication?.trackSid === effectiveFocusSid) : null;
  const otherTracks = tracks.filter((t) => t.publication?.trackSid !== effectiveFocusSid);

  if (effectiveFocusSid && focusedTrack) {
    const focusedSid = focusedTrack.publication?.trackSid;
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
        {/* Main Focus Area (70%) */}
        <div className="flex-[7] min-h-0 bg-neutral-900 rounded-2xl overflow-hidden border border-blue-500/30 relative group">
          <ParticipantTile trackRef={focusedTrack} />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => focusedSid && onTrackFocus(focusedSid)}
              className="px-2 py-1 bg-black/50 backdrop-blur text-[10px] text-white rounded border border-white/10 uppercase tracking-tighter"
            >
              {focusedTrackSid ? "Release Focus" : "Manual Focus"}
            </button>
          </div>
        </div>

        {/* Sidebar Grid (30%) */}
        <div className="flex-[3] flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          {otherTracks.map((track) => {
            const sid = track.publication?.trackSid;
            const focus = () => sid && onTrackFocus(sid);
            return (
              <button
                key={track.participant.identity + track.source + sid}
                type="button"
                onClick={focus}
                className="aspect-video bg-neutral-900 rounded-xl overflow-hidden cursor-pointer border border-transparent hover:border-white/20 transition-all flex-shrink-0 text-left"
              >
                <ParticipantTile trackRef={track} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mb-4 h-full overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto p-1">
        {cameraTracks.map((track) => {
          const sid = track.publication?.trackSid;
          const focus = () => sid && onTrackFocus(sid);
          return (
            <button
              key={track.participant.identity + track.source + sid}
              type="button"
              onClick={focus}
              className="aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer text-left"
            >
              <ParticipantTile trackRef={track} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TranscriptionFeed() {
  const room = useRoomContext();
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    if (!room) return;

    // SOTA: Handle built-in transcription events (SDK v2)
    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      segments.forEach((s) => {
        if (s.final) {
          const entry: TranscriptEntry = {
            id: `v2-${s.id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            speaker: participant?.identity || "Unknown",
            text: s.text,
          };
          setTranscripts((prev) => [...prev.slice(-49), entry]);
        }
      });
    };

    const handleData = (payload: Uint8Array, participant: { identity: string } | undefined) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        if (data.type === "transcription" || data.transcript) {
          const entry: TranscriptEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            speaker: data.speaker || participant?.identity || "Agent",
            text: data.transcript || data.text || "",
          };
          setTranscripts((prev) => [...prev.slice(-49), entry]);
          telemetry.log("TRANSCRIPTION_RECEIVED", { speaker: entry.speaker });
        }
      } catch {
        // Non-JSON data, ignore
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  // Subscribe to participant metadata changes (agent may publish transcriptions there)
  useEffect(() => {
    if (!room) return;

    const handleMetadata = (
      _prevMetadata: string | undefined,
      participant: { identity: string; metadata?: string },
    ) => {
      try {
        const meta = JSON.parse(participant.metadata || "{}");
        if (meta.lastTranscript) {
          const entry: TranscriptEntry = {
            id: `meta-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            speaker: participant.identity,
            text: meta.lastTranscript,
          };
          setTranscripts((prev) => {
            // Avoid duplicates
            if (prev.some((t) => t.text === entry.text && t.speaker === entry.speaker)) {
              return prev;
            }
            return [...prev.slice(-49), entry];
          });
        }
      } catch {
        // Invalid metadata
      }
    };

    room.on(RoomEvent.ParticipantMetadataChanged, handleMetadata);
    return () => {
      room.off(RoomEvent.ParticipantMetadataChanged, handleMetadata);
    };
  }, [room]);

  if (transcripts.length === 0) {
    return (
      <div className="flex-1 space-y-2 overflow-y-auto">
        <div className="text-blue-400 font-mono text-sm">[SYSTEM] Waiting for transcriptions...</div>
        <div className="text-gray-500 font-mono text-sm opacity-50">Monitoring for Ontological Drift...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto font-mono text-sm">
      {transcripts.map((entry) => (
        <div key={entry.id} className="border-l-2 border-gray-700 pl-2 py-1">
          <span className="text-gray-500 text-[10px]">{entry.timestamp}</span>
          <p className="text-white">
            <span className="text-blue-400">{entry.speaker}:</span> {entry.text}
          </p>
        </div>
      ))}
    </div>
  );
}
