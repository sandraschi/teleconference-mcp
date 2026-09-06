"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Activity,
  Calendar,
  Library,
  Paperclip,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onHelpClick: () => void;
}

const SIDEBAR_COLLAPSED_KEY = "ag-visio-sidebar-collapsed";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/recordings", label: "Recordings", icon: Library },
  { href: "/files", label: "Files", icon: Paperclip },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ onHelpClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-neutral-900 border-r border-gray-800 transition-all duration-300 ease-in-out",
        "max-lg:hidden", // hide on mobile, show on desktop
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Title */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800">
        <Monitor className="w-6 h-6 text-blue-500 flex-shrink-0" />
        {!isCollapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-sm font-bold text-white truncate">AG-VISIO</h1>
            <span className="text-[10px] text-gray-500 font-mono">V2.1.0</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-neutral-800 hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {/* Help Button */}
        <button
          onClick={onHelpClick}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title={isCollapsed ? "Help (Press ?)" : undefined}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm flex-1 text-left">Help</span>
          )}
          {!isCollapsed && (
            <kbd className="text-[10px] bg-neutral-700 px-1.5 py-0.5 rounded text-gray-400">
              ?
            </kbd>
          )}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
