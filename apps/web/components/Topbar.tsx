"use client";

import { useState, useRef, useEffect } from "react";
import {
  HelpCircle,
  Terminal,
  User,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  Share2,
  Users as UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ShareRoomModal from "./ShareRoomModal";

export interface RoomInfo {
  name: string;
  participantCount?: number;
}

interface TopbarProps {
  userName?: string;
  currentRoom?: string;
  isConnected?: boolean;
  onHelpClick: () => void;
  onLoggerClick: () => void;
  onRoomChange?: (roomName: string) => void;
  onLogout?: () => void;
  availableRooms?: string[];
  roomsWithCount?: RoomInfo[];
  onContactsClick: () => void;
}

export default function Topbar({
  userName,
  currentRoom,
  isConnected = false,
  onHelpClick,
  onLoggerClick,
  onRoomChange,
  onLogout,
  availableRooms = ["ag-visio-conference", "development", "testing"],
  roomsWithCount = [],
  onContactsClick,
}: TopbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const roomMenuRef = useRef<HTMLDivElement>(null);

  const getParticipantCount = (roomName: string) =>
    roomsWithCount.find((r) => r.name === roomName)?.participantCount;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        roomMenuRef.current &&
        !roomMenuRef.current.contains(event.target as Node)
      ) {
        setIsRoomMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-gray-800 bg-neutral-900/80 backdrop-blur-sm">
      {/* Left: Room Selector (if connected) */}
      <div className="flex items-center gap-4">
        {isConnected && currentRoom && onRoomChange && (
          <div className="relative" ref={roomMenuRef}>
            <button
              onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-300">Room:</span>
                <span className="text-white font-medium">{currentRoom}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isRoomMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-700">
                  <p className="text-xs text-gray-400 uppercase font-semibold">
                    Switch Room
                  </p>
                </div>
                <div className="py-1">
                  {availableRooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => {
                        onRoomChange(room);
                        setIsRoomMenuOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition-colors flex justify-between items-center",
                        room === currentRoom
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-neutral-700"
                      )}
                    >
                      <span>
                        {room}
                        {room === currentRoom && (
                          <span className="ml-2 text-xs text-blue-300">
                            (current)
                          </span>
                        )}
                      </span>
                      {getParticipantCount(room) !== undefined && (
                        <span className="text-xs text-gray-400">
                          {getParticipantCount(room)} in room
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-gray-600 rounded-full" />
            <span>Not connected</span>
          </div>
        )}
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-2">
        {/* Share Room Button */}
        {isConnected && currentRoom && (
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Share room link"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}

        {/* Help Button */}
        <button
          onClick={onHelpClick}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Help (Press ?)"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Logger Button */}
        <button
          onClick={onLoggerClick}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="View Logs"
        >
          <Terminal className="w-5 h-5" />
        </button>

        {/* Contacts Button */}
        <button
          onClick={onContactsClick}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Address Book"
        >
          <UsersIcon className="w-5 h-5" />
        </button>

        {/* User Menu */}
        {userName ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {(userName[0] ?? "?").toUpperCase()}
              </div>
              <span className="text-sm text-white hidden md:inline">
                {userName}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-neutral-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-3 border-b border-gray-700">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-gray-400">
                    {isConnected ? "Connected" : "Offline"}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-neutral-700 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </Link>

                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-neutral-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave Room
                    </button>
                  )}
                </div>

                <div className="px-3 py-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    AG-Visio v0.1.0-SOTA
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg">
            <User className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-400">Guest</span>
          </div>
        )}
      </div>

      <ShareRoomModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomName={currentRoom ?? ""}
      />
    </header>
  );
}
