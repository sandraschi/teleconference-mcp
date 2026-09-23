"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Download, File, Loader2, Paperclip } from "lucide-react";
import { useRoomContext } from "@livekit/components-react";

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
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function FileSharingPanel() {
  const room = useRoomContext();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      try {
        const msg: { type?: string } = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "file_shared") {
          loadFiles();
        }
        // eslint-disable-next-line no-empty -- non-file packets belong to other features
      } catch {}
    };
    room.on("dataReceived", onData);
    return () => {
      room.off("dataReceived", onData);
    };
  }, [room, loadFiles]);

  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setUploadProgress("File too large (max 50MB)");
      setTimeout(() => setUploadProgress(null), 3000);
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploaded_by", room.localParticipant?.identity || "anonymous");

      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const entry: FileEntry = await res.json();
      setFiles((prev) => [entry, ...prev]);

      // Broadcast to room via data channel
      try {
        const msg = JSON.stringify({ type: "file_shared", id: entry.id, name: entry.name });
        await room.localParticipant?.publishData(new TextEncoder().encode(msg));
        // eslint-disable-next-line no-empty -- broadcast is best-effort
      } catch {}

      setUploadProgress("Uploaded!");
      setTimeout(() => setUploadProgress(null), 2000);
    } catch {
      setUploadProgress("Upload failed");
      setTimeout(() => setUploadProgress(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  };

  const handleDownload = (file: FileEntry) => {
    window.open(`/api/files/${file.id}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/30">
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Files</span>
        </div>
        <span className="text-xs text-gray-400">{files.length} files</span>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mx-3 mt-3 p-4 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
          dragOver ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-500"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-xs text-gray-400">{uploadProgress}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-gray-500" />
            <span className="text-xs text-gray-400">Drop files or click to upload</span>
            <span className="text-xs text-gray-400">Max 50MB</span>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
            <Paperclip className="w-8 h-8 mb-2" />
            <p className="text-xs">No files shared yet.</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 bg-neutral-800/60 rounded-lg p-3 hover:bg-neutral-800 transition-colors group"
            >
              <File className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{formatSize(file.size)}</span>
                  <span>{file.uploaded_by}</span>
                  <span>{formatDate(file.uploaded_at)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(file)}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-neutral-700 rounded transition-all"
                title="Download"
              >
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
