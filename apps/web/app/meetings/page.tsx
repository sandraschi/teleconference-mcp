"use client";

import { ArrowLeft, Calendar, CheckCheck, Clock, Link2, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Meeting {
  id: string;
  title: string;
  room_name: string;
  start_utc: string;
  end_utc: string;
  duration_min: number;
  link: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now() - 600000;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(30);
  const [roomName, setRoomName] = useState("ag-visio-conference");
  const [isCreating, setIsCreating] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_utc: new Date(date).toISOString(),
          duration_min: duration,
          room_name: roomName.trim() || "ag-visio-conference",
        }),
      });
      if (res.ok) {
        setTitle("");
        setShowForm(false);
        await loadMeetings();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (meeting: Meeting) => {
    navigator.clipboard.writeText(meeting.link);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const upcoming = meetings.filter((m) => isUpcoming(m.start_utc));
  const past = meetings.filter((m) => !isUpcoming(m.start_utc));

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-2xl font-bold">Meetings</h1>
          </div>
          <button
            type="button"
            data-testid="meetings-new"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-neutral-900 border border-gray-800 rounded-xl p-6 mb-8 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              New Meeting
            </h2>

            <div>
              <label htmlFor="meetings-title" className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                id="meetings-title"
                type="text"
                data-testid="meetings-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sprint Review, 1:1, etc."
                required
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="meetings-date" className="block text-sm font-medium text-gray-300 mb-1">
                  Date & Time
                </label>
                <input
                  id="meetings-date"
                  type="datetime-local"
                  data-testid="meetings-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
              <div>
                <label htmlFor="meetings-duration" className="block text-sm font-medium text-gray-300 mb-1">
                  Duration (min)
                </label>
                <select
                  id="meetings-duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  title="Meeting duration"
                >
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="meetings-room" className="block text-sm font-medium text-gray-300 mb-1">
                Room
              </label>
              <input
                id="meetings-room"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="ag-visio-conference"
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Create Meeting
              </button>
            </div>
          </form>
        )}

        {/* Upcoming */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            Upcoming
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No upcoming meetings.</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Schedule one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} copiedId={copiedId} onCopy={handleCopyLink} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-400">Past</h2>
            <div className="space-y-3 opacity-60">
              {past.map((m) => (
                <MeetingCard key={m.id} meeting={m} copiedId={copiedId} onCopy={handleCopyLink} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  copiedId,
  onCopy,
}: {
  meeting: Meeting;
  copiedId: string | null;
  onCopy: (m: Meeting) => void;
}) {
  const isCopied = copiedId === meeting.id;
  return (
    <div className="bg-neutral-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{meeting.title}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(meeting.start_utc)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(meeting.start_utc)} ({meeting.duration_min}min)
            </span>
            <span className="text-gray-500">@{meeting.room_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onCopy(meeting)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Copy invite link"
          >
            {isCopied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
