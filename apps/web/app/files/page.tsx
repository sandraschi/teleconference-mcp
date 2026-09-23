"use client";

import { ArrowLeft, Download, File, Loader2, Paperclip, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
  uploaded_by: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data: { files?: FileEntry[] } = await res.json();
      setFiles(data.files ?? []);
      // eslint-disable-next-line no-empty -- empty list state already renders below
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setStatus("Max 50MB");
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setIsUploading(true);
    setStatus(`Uploading ${file.name}...`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploaded_by", "user");
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const entry: FileEntry = await res.json();
      setFiles((p) => [entry, ...p]);
      setStatus("Uploaded!");
    } catch {
      setStatus("Failed");
    } finally {
      setIsUploading(false);
      setTimeout(() => setStatus(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-2xl font-bold">Files</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>

        {status && (
          <div className="mb-4 px-4 py-2 bg-neutral-800 rounded-lg text-sm text-gray-300 text-center">{status}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Paperclip className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files shared yet.</p>
            <p className="text-sm mt-2">Upload a file to share it with the room.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-4 bg-neutral-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <File className="w-6 h-6 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatSize(f.size)} &middot; {f.uploaded_by} &middot; {formatDate(f.uploaded_at)}
                  </p>
                </div>
                <a
                  href={`/api/files/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
