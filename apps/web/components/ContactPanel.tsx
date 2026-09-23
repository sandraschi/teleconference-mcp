"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Users,
  RefreshCw,
  Search,
  Mail,
  Building,
  ChevronRight,
  ShieldCheck,
  Globe
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: "office" | "windows" | "google" | "unknown";
  avatar_url?: string;
}

export default function ContactPanel() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/contacts");
      const data = await resp.json();
      setContacts(data.contacts || []);
    } catch (e) {
      console.error("Failed to fetch contacts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Address Book</h3>
        </div>
        <button 
          onClick={fetchContacts}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-xs text-gray-400 font-mono italic">Synchronizing with substrate...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <Users className="w-12 h-12 text-gray-800 mb-4" />
            <p className="text-sm text-gray-400">No contacts found</p>
            <p className="text-xs text-gray-400 mt-1">Try refreshing or changing your search</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div 
              key={contact.id}
              className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
            >
              {/* Avatar */}
              <div className="relative w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/10">
                {contact.avatar_url ? (
                  <Image src={contact.avatar_url} alt={contact.name} fill sizes="40px" className="object-cover" />
                ) : (
                  <span className="text-sm font-bold text-gray-400">{contact.name.charAt(0)}</span>
                )}
                {/* Source Badge */}
                <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-neutral-900 rounded-full border border-white/10">
                  {contact.source === "office" ? (
                    <div title="Office Verified">
                      <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                    </div>
                  ) : contact.source === "google" ? (
                    <div title="Google Sync">
                      <Globe className="w-2.5 h-2.5 text-red-400" />
                    </div>
                  ) : (
                    <div title="Local Windows">
                      <Building className="w-2.5 h-2.5 text-orange-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-200 truncate">{contact.name}</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 truncate">
                      <Building className="w-3 h-3 shrink-0" />
                      <span>{contact.company}</span>
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-white/[0.01] border-top border-white/5">
        <p className="text-xs text-gray-400 font-mono text-center">
          Materialist Substrate Sync: Verified
        </p>
      </div>
    </div>
  );
}
