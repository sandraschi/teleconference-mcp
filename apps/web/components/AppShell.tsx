"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import HelpModal from "@/components/HelpModal";
import { getSettings } from "@/lib/settings";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const { theme } = getSettings();
    const root = document.documentElement;
    if (theme === "light") root.classList.remove("dark");
    else if (theme === "dark") root.classList.add("dark");
    else root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
      e.preventDefault();
      setIsHelpOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar onHelpClick={() => setIsHelpOpen(true)} />
      {/* Scroll container: pages taller than the viewport scroll here.
          (overflow-hidden here used to clip the whole dashboard.) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
