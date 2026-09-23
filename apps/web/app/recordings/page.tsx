"use client";

import { ArrowLeft, Calendar, Clock, Loader2, Monitor, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Recording {
  id: string;
  room_name: string;
  started_at: string;
  duration_sec: number;
  status: string;
  url?: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/egress?type=recordings");
      const data = await res.json();
      setRecordings(data.recordings ?? []);
    } catch {
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-2xl font-bold">Recordings</h1>
          </div>
          <button
            type="button"
            onClick={loadRecordings}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors"
          >
            <Loader2 className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recordings found.</p>
            <p className="text-sm mt-2">Join a room and click the Record button to start.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="bg-neutral-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{rec.room_name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(rec.started_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(rec.duration_sec)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          rec.status === "completed"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-yellow-900/50 text-yellow-400"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Play
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
