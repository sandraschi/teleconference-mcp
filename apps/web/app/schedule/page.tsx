"use client";

import { Calendar, Copy, Link2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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

export default function SchedulePage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  const [durationMin, setDurationMin] = useState(60);
  const [roomName, setRoomName] = useState("ag-visio-conference");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const after = new Date().toISOString();
      const res = await fetch(`/api/meetings?after=${encodeURIComponent(after)}&limit=20`);
      if (res.ok) {
        const data = (await res.json()) as { meetings: Meeting[] };
        setMeetings(data.meetings ?? []);
      }
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const startUtc = date && time ? new Date(`${date}T${time}`).toISOString() : new Date().toISOString();
    setCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_utc: startUtc,
          duration_min: durationMin,
          room_name: roomName.trim() || "ag-visio-conference",
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as Meeting;
        setMeetings((prev) =>
          [created, ...prev].sort((a, b) => new Date(a.start_utc).getTime() - new Date(b.start_utc).getTime()),
        );
        setTitle("");
        setDate("");
        setTime("14:00");
      }
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-500" />
          Schedule
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Create meetings and share room links. No external calendar required.
        </p>
      </div>

      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-500" />
          Create meeting
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="sched-title" className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              id="sched-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Standup"
              className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-date" className="block text-sm font-medium text-gray-300 mb-1">
                Date
              </label>
              <input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sched-time" className="block text-sm font-medium text-gray-300 mb-1">
                Time
              </label>
              <input
                id="sched-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-duration" className="block text-sm font-medium text-gray-300 mb-1">
                Duration (min)
              </label>
              <select
                id="sched-duration"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
                <option value={120}>120</option>
              </select>
            </div>
            <div>
              <label htmlFor="sched-room" className="block text-sm font-medium text-gray-300 mb-1">
                Room name
              </label>
              <input
                id="sched-room"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="ag-visio-conference"
                className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              creating || !title.trim()
                ? "bg-neutral-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white",
            )}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create & get link
          </button>
        </form>
      </section>

      <section className="bg-neutral-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Upcoming meetings</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : meetings.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming meetings. Create one above.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 py-3 border-b border-gray-800 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{m.title}</p>
                  <p className="text-gray-500 text-sm">
                    {formatDate(m.start_utc)} · {m.duration_min} min · {m.room_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(m.link, m.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg transition-colors shrink-0"
                  title="Copy room link"
                >
                  {copiedId === m.id ? (
                    <span className="text-green-400 text-sm">Copied</span>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy link
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
