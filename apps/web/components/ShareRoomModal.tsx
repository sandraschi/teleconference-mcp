"use client";

import Image from "next/image";
import { useState } from "react";
import Modal from "@/components/ui/Modal";

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export default function ShareRoomModal({ isOpen, onClose, roomName }: ShareRoomModalProps) {
  const [copied, setCopied] = useState(false);
  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}?room=${encodeURIComponent(roomName)}` : "";

  const qrUrl = roomUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(roomUrl)}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${roomName}`,
          text: `Join the conference room: ${roomName}`,
          url: roomUrl,
        });
        onClose();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Room Link">
      <div className="flex flex-col items-center gap-4 p-4">
        {qrUrl && (
          <Image src={qrUrl} alt="QR code for room" width={192} height={192} className="rounded-lg bg-white p-2" />
        )}
        <div className="w-full">
          <label htmlFor="share-room-url" className="block text-xs text-gray-400 mb-1">
            Room URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="share-room-url"
              readOnly
              value={roomUrl}
              className="flex-1 px-3 py-2 bg-neutral-800 border border-gray-700 rounded-lg text-sm text-gray-300"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm"
        >
          Share via...
        </button>
      </div>
    </Modal>
  );
}
