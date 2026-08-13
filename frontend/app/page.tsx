"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigError } from "../lib/supabase";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

// Icons
function IconBrand() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
      </svg>
    </div>
  );
}
function IconArchive({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M1 3h22v5H1V3zM10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDelete({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDotsHorizontal({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
      <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconEdit({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFolder({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPin({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M21 10h-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5H3v2h4l2 7 1 1h4l1-1 2-7h4v-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRename({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconShare({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpeaker({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 10 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPanel() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 4v16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconNewChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 3.5a2.1 2.1 0 1 1 3 3L12 16l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
      <path d="m6 17 4-4 3 3 2-2 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconApps() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="4" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="14" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconSpark({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3 14 8l5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor" />
    </svg>
  );
}
function IconSettings({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconHelp({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M9.3 9.3a3 3 0 0 1 5.4 1.8c0 2-2.7 2.4-2.7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconVoiceBars() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 14v-4M9 17V7M14 15V9M19 13v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconSendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m18 6-12 12M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m20 6-11 11-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUserCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17.5 18.5c-1-2.5-3-4.5-5.5-4.5s-4.5 2-5.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconRecents() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8h-2.2l-3.3 2.6.6-3.3A8 8 0 0 1 4 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconTempChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function IconGoogleMark() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-2 3.1l3.1 2.4c1.8-1.6 2.9-4 2.9-6.8 0-.7-.1-1.3-.2-1.9H12Z" />
      <path fill="#34A853" d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2l-3.2 2.5c1.5 3 4.7 5.5 8.9 5.5Z" />
      <path fill="#4A90E2" d="M6.4 13.5a5.9 5.9 0 0 1 0-3.7L3.2 7.3a9.5 9.5 0 0 0 0 8.7l3.2-2.5Z" />
      <path fill="#FBBC05" d="M12 6.1c1.5 0 2.9.5 4 1.5l3-3A9.7 9.7 0 0 0 3.2 7.3l3.2 2.5c.8-2.4 3-4.2 5.6-4.2Z" />
    </svg>
  );
}
function IconAppleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M16.3 12.5c0-2 1.6-3 1.7-3.1-1-1.4-2.6-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.9-3.5 2.2-1.5 2.7-.4 6.6 1.1 8.8.7 1 1.6 2.1 2.8 2 1.1 0 1.6-.7 3-.7 1.5 0 1.9.7 3 .7 1.2 0 2-1 2.7-2 .8-1.1 1.2-2.2 1.2-2.3 0 0-2.9-1.1-2.9-4Z" />
      <path fill="currentColor" d="M14.1 6.4c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.7 1.2-.6.7-1.1 1.7-1 2.7 1 0 2.1-.5 2.8-1.2Z" />
    </svg>
  );
}
function IconPhoneMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 4.5c.3-.3.8-.4 1.2-.2l2.4 1c.5.2.7.8.5 1.3l-1 2.4a1 1 0 0 0 .2 1.1l2.1 2.1a1 1 0 0 0 1.1.2l2.4-1c.5-.2 1.1 0 1.3.5l1 2.4c.2.4.1.9-.2 1.2l-1.2 1.2c-.8.8-2.1 1.1-3.2.7a16.3 16.3 0 0 1-9.9-9.9c-.4-1.1-.1-2.4.7-3.2l1.2-1.2Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconEmailMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="m5.5 8 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconPaperclip() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 12.5V7.8a4.2 4.2 0 0 1 8.4 0v8.5a6.2 6.2 0 1 1-12.4 0V7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconBulb() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a7 7 0 0 0-4 12.8c.7.5 1.2 1.2 1.5 2h5c.3-.8.8-1.5 1.5-2A7 7 0 0 0 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFileUp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 3H8a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m14 10 3-3 3 3M17 7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconImageTool() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
      <path d="m6 17 3.5-3.5 2.5 2.5 2-2 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconReleaseNotes({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDownload({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBook({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SavedAccount = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider?: string;
};

type UiMessage = {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  route?: string;
  sourceName?: string;
  freshness?: string;
};
type ChatThread = { id: string; title: string; messages: UiMessage[]; updatedAt: number };
type RecentItem = { id: string; title: string };
type ProviderHealth = {
  keys_loaded: Record<string, boolean>;
  provider_priority: string[];
  web_search_available: boolean;
  route_for_prompt?: string;
};
type DebugChatResult = {
  prompt: string;
  provider: string | null;
  route: string | null;
  source_name?: string | null;
  freshness?: string | null;
  fallback_used: boolean;
  provider_errors: string[];
  answer: string;
};

function MarkdownMessage({ text }: { text: string }) {
  const blocks = text.split("```");
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (i % 2 === 1) {
          const lines = block.split("\n");
          const lang = lines[0]?.trim();
          const code = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className="rounded-xl border border-white/10 bg-[#141519] p-3">
              {lang ? <p className="mb-2 text-[12px] text-white/50">{lang}</p> : null}
              <pre className="overflow-x-auto text-[14px] leading-relaxed text-[#d8d8d8]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={i} className="space-y-2">
            {block.split("\n").map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={idx} className="h-1" />;

              // Simple image detection ![alt](url)
              const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
              if (imgMatch) {
                return (
                  <div key={idx} className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={imgMatch[2]} alt={imgMatch[1] || "AI Image"} className="max-h-[512px] w-auto object-contain" />
                  </div>
                );
              }

              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return <p key={idx}>• {trimmed.slice(2)}</p>;
              }
              if (/^\d+\.\s/.test(trimmed)) return <p key={idx}>{trimmed}</p>;
              return <p key={idx}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function RecentChatItem({
  item,
  isPinned,
  onOpenRecent,
  onTogglePin,
  onRenameRecent,
  onArchiveRecent,
  onDeleteRecent,
  openOptionsId,
  setOpenOptionsId
}: {
  item: RecentItem;
  isPinned: boolean;
  onOpenRecent?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onRenameRecent?: (id: string) => void;
  onArchiveRecent?: (id: string) => void;
  onDeleteRecent?: (id: string) => void;
  openOptionsId: string | null;
  setOpenOptionsId: (id: string | null) => void;
}) {
  const isMenuOpen = openOptionsId === item.id;

  return (
    <div className="relative group/item px-3">
      <button
        onClick={() => onOpenRecent?.(item.id)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition hover:bg-white/[0.08] text-white/80 group-hover/item:pr-16"
      >
        <span className="truncate flex-1">{item.title}</span>
      </button>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin?.(item.id); }}
          className={`p-1 rounded-md hover:bg-white/10 ${isPinned ? 'text-white' : 'text-white/40'}`}
          title={isPinned ? "Unpin chat" : "Pin chat"}
        >
          <IconPin className={isPinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenOptionsId(isMenuOpen ? null : item.id); }}
          className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white"
          title="More options"
        >
          <IconDotsHorizontal />
        </button>
      </div>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setOpenOptionsId(null)} />
          <div className="absolute left-full top-0 ml-1 w-[180px] rounded-xl bg-[#202123] border border-white/10 p-1.5 shadow-2xl z-[120] animate-[slidePop_.1s_ease-out]">
            <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] hover:bg-white/5 text-white/90 transition-colors">
              <IconShare className="text-white/40" /> Share
            </button>
            <button
              onClick={() => { onRenameRecent?.(item.id); setOpenOptionsId(null); }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] hover:bg-white/5 text-white/90 transition-colors"
            >
              <IconRename className="text-white/40" /> Rename
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] hover:bg-white/5 text-white/90 transition-colors">
              <IconFolder className="text-white/40" /> Move to project
            </button>
            <button
              onClick={() => { onTogglePin?.(item.id); setOpenOptionsId(null); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] hover:bg-white/5 text-white/90 transition-colors"
            >
              <IconPin className="text-white/40" /> {isPinned ? 'Unpin chat' : 'Pin chat'}
            </button>
            <button
              onClick={() => { onArchiveRecent?.(item.id); setOpenOptionsId(null); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] hover:bg-white/5 text-white/90 transition-colors"
            >
              <IconArchive className="text-white/40" /> Archive
            </button>
            <div className="my-1 border-t border-white/5" />
            <button
              onClick={() => { onDeleteRecent?.(item.id); setOpenOptionsId(null); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] hover:bg-white/5 text-red-400 transition-colors"
            >
              <IconDelete /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function IconPersonalization({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconBug({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 6V3M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-6 6H3m15 0h3m-1.5-6.5l2-2m-15 0l-2 2m15 11l2 2m-15 0l-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconKeyboard({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-[fadeIn_.2s_ease-out]">
      <div className="relative w-full max-w-[900px] rounded-[32px] bg-[#171717] border border-white/10 p-8 text-white shadow-2xl overflow-y-auto max-h-[95vh] hide-scrollbar">
        <button onClick={onClose} className="absolute right-6 top-6 p-2 text-white/50 hover:text-white transition-colors">
          <IconX className="w-6 h-6" />
        </button>

        <h2 className="text-center text-[32px] font-bold mb-2">Upgrade your plan</h2>
        <p className="text-center text-white/50 mb-10">Find your best fit</p>

        <div className="flex justify-center mb-10">
          <div className="flex bg-[#2f2f2f] p-1 rounded-2xl">
            <button className="px-8 py-2 rounded-xl bg-[#3d3d3d] text-sm font-bold shadow-lg">Personal</button>
            <button className="px-8 py-2 rounded-xl text-sm font-bold text-white/50 hover:text-white transition-colors">Business</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-[28px] bg-[#212121] p-8 border border-white/5 flex flex-col h-full">
            <h3 className="text-[20px] font-bold mb-2">Free</h3>
            <p className="text-[24px] font-medium mb-6">Try ChatGPT</p>
            <p className="text-white/50 mb-8">For quick, everyday help</p>

            <div className="text-[32px] font-bold mb-8">₹0 <span className="text-[16px] text-white/30 font-normal">/ month</span></div>

            <button className="w-full h-14 rounded-full border border-white/10 text-white/30 font-bold mb-10 cursor-not-allowed">Your current plan</button>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconSpark className="text-white/40" /> Core model</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconMic className="text-white/40" /> Limited messages and uploads</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconImageTool className="text-white/40" /> Limited image creation</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconUserCircle className="text-white/40" /> Limited memory</li>
            </ul>
          </div>

          <div className="rounded-[28px] bg-[#212121] p-8 border border-blue-500/20 flex flex-col h-full relative">
            <div className="absolute top-8 right-8 bg-blue-500/10 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase">Recommended</div>
            <h3 className="text-[20px] font-bold mb-2">ChatGPT Plus</h3>
            <p className="text-[24px] font-medium mb-6">Your AI assistant</p>
            <p className="text-white/50 mb-8">Unlock advanced intelligence that adapts to your preferences the more you use it.</p>

            <div className="text-[32px] font-bold mb-8">₹1,999 <span className="text-[16px] text-white/30 font-normal">/ month</span></div>

            <button className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold mb-10 transition-all flex items-center justify-center gap-2">
              <IconPlus className="w-5 h-5" /> Upgrade to Plus
            </button>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconSpark className="text-blue-400" /> Advanced models</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconBulb className="text-blue-400" /> Advanced image creation with Thinking</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconRecents className="text-blue-400" /> Expanded memory across chats</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconApps className="text-blue-400" /> Work agent for multi-step tasks</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconEdit className="text-blue-400" /> Codex agent for coding</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconSearch className="text-blue-400" /> Expanded deep research</li>
              <li className="flex items-center gap-3 text-[14px] text-white/80"><IconBrand className="text-blue-400" /> Projects and custom GPTs</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-[12px] text-white/20 mt-10">Have an existing plan? <span className="underline cursor-pointer">See billing help</span></p>
      </div>
    </div>
  );
}

function Sidebar({
  compact = false,
  sidebarCollapsed = false,
  onToggleSidebar,
  onAuthClick,
  onSignOut,
  isAuthenticated,
  userEmail,
  userName,
  profileMenuOpen,
  onToggleProfileMenu,
  hasRecents = false,
  compactGuestMenuOpen = false,
  onToggleCompactGuestMenu,
  onOpenEditProfile,
  accountSwitchOpen = false,
  onToggleAccountSwitch,
  savedAccounts = [],
  activeAccountId,
  onSwitchAccount,
  onAddAccount,
  recentItems = [],
  onNewChat,
  onOpenRecent,
  onRenameRecent,
  onDeleteRecent,
  pinnedChatIds = [],
  onTogglePin,
  onArchiveRecent,
  onUpgradeClick,
}: {
  compact?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onAuthClick?: () => void;
  onSignOut?: () => void;
  isAuthenticated?: boolean;
  userEmail?: string;
  userName?: string;
  profileMenuOpen?: boolean;
  onToggleProfileMenu?: () => void;
  hasRecents?: boolean;
  compactGuestMenuOpen?: boolean;
  onToggleCompactGuestMenu?: () => void;
  onOpenEditProfile?: () => void;
  accountSwitchOpen?: boolean;
  onToggleAccountSwitch?: () => void;
  savedAccounts?: SavedAccount[];
  activeAccountId?: string;
  onSwitchAccount?: (account: SavedAccount) => void;
  onAddAccount?: () => void;
  recentItems?: RecentItem[];
  onNewChat?: () => void;
  onOpenRecent?: (id: string) => void;
  onRenameRecent?: (id: string) => void;
  onDeleteRecent?: (id: string) => void;
  pinnedChatIds?: string[];
  onTogglePin?: (id: string) => void;
  onArchiveRecent?: (id: string) => void;
  onUpgradeClick?: () => void;
}) {
  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);
  const [helpSubmenuOpen, setHelpSubmenuOpen] = useState(false);
  const [accountSubmenuOpen, setAccountSubmenuOpen] = useState(false);
  const initial = (userName?.[0] || userEmail?.[0] || "U").toUpperCase();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (profileMenuOpen) onToggleProfileMenu?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen, onToggleProfileMenu]);

  useEffect(() => {
    if (!profileMenuOpen) {
      setHelpSubmenuOpen(false);
      setAccountSubmenuOpen(false);
    }
  }, [profileMenuOpen]);

  return (
    <div className="flex h-full flex-col bg-black text-[#ececec]">
      {compact ? (
        <div className="flex flex-col items-center py-3 space-y-3">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-white/10 rounded-xl transition-colors mb-1">
            <IconBrand />
          </button>
          <button onClick={onNewChat} title="New chat" className="p-2 hover:bg-white/10 rounded-xl text-white/70 transition-colors">
            <IconNewChat />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-xl text-white/70 transition-colors">
            <IconSearch />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-xl text-white/70 transition-colors">
            <IconImage />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-3 h-[60px]">
          <div className="flex items-center">
            <button onClick={onToggleSidebar} className="p-2 hover:bg-white/10 rounded-lg text-white/50 transition-colors">
              <IconBrand />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/50 transition-colors">
              <IconSearch />
            </button>
            <button onClick={onToggleSidebar} className="p-2 hover:bg-white/10 rounded-lg text-white/50 transition-colors">
              <IconPanel />
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-1 ${compact ? "flex flex-col items-center" : ""}`}>
        {!compact && (
          <button
            onClick={onNewChat}
            className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition hover:bg-white/[0.08]"
          >
            <IconPlus />
            <span>New chat</span>
          </button>
        )}

        {(compact
          ? []
          : [
              { label: "Search chats", icon: <IconSearch /> },
              { label: "Images", icon: <IconImage /> },
            ]
        ).map((item) => (
          <button
            key={item.label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-white/[0.08] ${compact ? "justify-center" : ""}`}
          >
            {item.icon}
            {!compact && <span>{item.label}</span>}
          </button>
        ))}

        {!compact && isAuthenticated && recentItems.length > 0 && (
          <div className="pt-4 pb-2">
            {pinnedChatIds.length > 0 && (
              <div className="mb-4">
                <p className="px-3 text-[11px] font-bold text-white/30 uppercase tracking-[0.1em] mb-2">Pinned</p>
                <div className="space-y-0.5">
                  {recentItems.filter(i => pinnedChatIds.includes(i.id)).map((item) => (
                    <RecentChatItem
                      key={item.id}
                      item={item}
                      isPinned={true}
                      onOpenRecent={onOpenRecent}
                      onTogglePin={onTogglePin}
                      onRenameRecent={onRenameRecent}
                      onArchiveRecent={onArchiveRecent}
                      onDeleteRecent={onDeleteRecent}
                      openOptionsId={openOptionsId}
                      setOpenOptionsId={setOpenOptionsId}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="px-3 text-[11px] font-bold text-white/30 uppercase tracking-[0.1em] mb-2">Recent</p>
            <div className="space-y-0.5">
              {recentItems.filter(i => !pinnedChatIds.includes(i.id)).slice(0, 15).map((item) => (
                <RecentChatItem
                  key={item.id}
                  item={item}
                  isPinned={false}
                  onOpenRecent={onOpenRecent}
                  onTogglePin={onTogglePin}
                  onRenameRecent={onRenameRecent}
                  onArchiveRecent={onArchiveRecent}
                  onDeleteRecent={onDeleteRecent}
                  openOptionsId={openOptionsId}
                  setOpenOptionsId={setOpenOptionsId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`px-3 py-4 space-y-1 border-t border-white/10 ${compact ? "flex flex-col items-center" : ""}`}>
        {!compact &&
          [
            { label: "See plans and pricing", icon: <IconApps />, onClick: onUpgradeClick },
            { label: "Settings", icon: <IconSettings />, onClick: onOpenEditProfile },
            { label: "Help", icon: <IconHelp />, onClick: () => setHelpSubmenuOpen(!helpSubmenuOpen) },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-white/[0.08] text-[#ececec]"
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

        {!compact && !isAuthenticated && (
          <div className="mt-2 rounded-xl bg-white/[0.03] p-3 border border-white/[0.06]">
            <h3 className="text-[13px] font-bold text-white/90">Get responses tailored to you</h3>
            <p className="mt-1 text-[12px] leading-snug text-white/40">
              Log in to get answers based on saved chats, plus create images and upload files.
            </p>
            <button
              onClick={onAuthClick}
              className="mt-3 h-[36px] w-full rounded-full border border-white/20 text-[13px] font-bold text-white transition hover:bg-white/10"
            >
              Log in
            </button>
          </div>
        )}

        {isAuthenticated && !compact && (
          <div className="relative mt-2" ref={menuRef}>
            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[240px] rounded-[24px] bg-[#232323] border border-white/10 p-2 shadow-2xl animate-[slidePop_.15s_ease-out] z-[120]">
                {/* Account Header with Submenu trigger */}
                <div className="relative">
                  <button
                    onClick={() => { setAccountSubmenuOpen(!accountSubmenuOpen); setHelpSubmenuOpen(false); }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8a600] text-[11px] font-bold text-white">
                        {initial}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="truncate text-[14px] font-medium">{userName || userEmail?.split("@")[0] || "User"}</p>
                        <p className="text-[11px] text-white/30 uppercase font-bold tracking-tight">Free</p>
                      </div>
                    </div>
                    <IconChevronDown className={`shrink-0 text-white/20 transition-transform ${accountSubmenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {accountSubmenuOpen && (
                    <div className="absolute left-[calc(100%+8px)] bottom-0 w-[240px] rounded-[24px] bg-[#232323] border border-white/10 p-2 shadow-2xl animate-[slidePop_.1s_ease-out]">
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Accounts</p>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto hide-scrollbar space-y-1">
                        {savedAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            onClick={() => onSwitchAccount?.(acc)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8a600] text-[11px] font-bold text-white">
                                {(acc.name?.[0] || acc.email[0]).toUpperCase()}
                              </div>
                              <div className="text-left min-w-0">
                                <p className="truncate text-[13.5px] font-medium">{acc.name}</p>
                                <p className="truncate text-[10px] text-white/30">{acc.email}</p>
                              </div>
                            </div>
                            {acc.id === activeAccountId && <IconCheck className="text-white/50 w-4 h-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                      <div className="my-1 border-t border-white/5" />
                      <button onClick={onAddAccount} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors mt-1">
                        <IconPlus className="text-white/40 w-4 h-4" />
                        <span className="text-[14px] font-medium">Add account</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="my-1 border-t border-white/5" />

                <button onClick={onUpgradeClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <IconSpark className="text-white/40" />
                  <span className="text-[14.5px] font-medium">Upgrade plan</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <IconPersonalization className="text-white/40" />
                  <span className="text-[14.5px] font-medium">Personalization</span>
                </button>
                <button onClick={onOpenEditProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <IconUserCircle className="text-white/40" />
                  <span className="text-[14.5px] font-medium">Profile</span>
                </button>
                <button onClick={onOpenEditProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <IconSettings className="text-white/40" />
                  <span className="text-[14.5px] font-medium">Settings</span>
                </button>

                <div className="my-1 border-t border-white/5" />

                {/* Help Submenu Trigger */}
                <div className="relative">
                  <button
                    onClick={() => { setHelpSubmenuOpen(!helpSubmenuOpen); setAccountSubmenuOpen(false); }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <IconHelp className="text-white/40" />
                      <span className="text-[14.5px] font-medium">Help</span>
                    </div>
                    <IconChevronDown className={`shrink-0 text-white/20 transition-transform -rotate-90 group-hover:text-white/40`} />
                  </button>

                  {helpSubmenuOpen && (
                    <div className="absolute left-[calc(100%+8px)] bottom-0 w-[240px] rounded-[24px] bg-[#232323] border border-white/10 p-2 shadow-2xl animate-[slidePop_.1s_ease-out]">
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconHelp className="text-white/40" />
                        <span className="text-[14px] font-medium">Help center</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconReleaseNotes className="text-white/40" />
                        <span className="text-[14px] font-medium">Release notes</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconDownload className="text-white/40" />
                        <span className="text-[14px] font-medium">Download apps</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconKeyboard className="text-white/40" />
                        <span className="text-[14px] font-medium">Keyboard shortcuts</span>
                      </button>
                      <div className="my-1 border-t border-white/5" />
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconBook className="text-white/40" />
                        <span className="text-[14px] font-medium">Terms of Service</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconHelp className="text-white/40" />
                        <span className="text-[14px] font-medium">Privacy Policy</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                        <IconBug className="text-white/40" />
                        <span className="text-[14px] font-medium">Report a bug</span>
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-white hover:bg-white/5 transition-colors group">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-white/60"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                   <span className="font-medium">Log out</span>
                </button>
              </div>
            )}
            <button
              onClick={onToggleProfileMenu}
              className="flex w-full items-center gap-3 rounded-xl p-2 transition hover:bg-white/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8a600] text-[13px] font-bold text-white">
                {initial}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-[14px] font-medium">{userName || userEmail?.split("@")[0] || "User"}</p>
                <p className="text-[11px] text-white/30 uppercase font-bold tracking-tight">Free</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onUpgradeClick?.(); }} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[11px] font-bold transition-colors">Upgrade</button>
            </button>
          </div>
        )}

        {compact && (
          <div className="relative mt-auto flex flex-col items-center mb-2">
            {compactGuestMenuOpen && (
              <div className="absolute bottom-0 left-[58px] w-[260px] rounded-3xl bg-[#232323] border border-white/10 p-2.5 shadow-2xl animate-[slidePop_.15s_ease-out] z-[100]">
                <button onClick={onUpgradeClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconSpark className="text-white/40" /> See plans and pricing
                </button>
                <button onClick={onOpenEditProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconSettings className="text-white/40" /> Settings
                </button>
                <div className="my-1.5 border-t border-white/5" />
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconHelp className="text-white/40" /> Help center
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconReleaseNotes className="text-white/40" /> Release notes
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconDownload className="text-white/40" /> Download apps
                </button>
                <div className="my-1.5 border-t border-white/5" />
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconBook className="text-white/40" /> Terms of Service
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] hover:bg-white/5 text-white/90 transition-colors text-left font-medium">
                  <IconHelp className="text-white/40" /> Privacy Policy
                </button>
                {isAuthenticated && (
                  <>
                    <div className="my-1.5 border-t border-white/5" />
                    <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-red-400 hover:bg-white/5 transition-colors text-left font-medium">
                      <IconX /> Log out
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              onClick={onToggleCompactGuestMenu}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              {isAuthenticated ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8a600] text-[12px] font-bold text-white ring-2 ring-transparent hover:ring-white/20 transition-all">
                  {initial}
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 text-white/40">
                  <IconUserCircle />
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InputBar({
  input,
  setInput,
  sendMessage,
  chatLoading,
  listening,
  startListening,
  stopListening,
  draftTranscript,
  setDraftTranscript,
  toolsOpen,
  setToolsOpen,
  hasText,
  fakeBars,
  onPickImage,
  webSearchOn,
  setWebSearchOn,
  isAuthenticated,
  onAuthClick,
  hasMessages,
  imagePreviews,
  removeImageAt,
  onGenerateImage,
  onReadAloud,
  onStopAudio,
  isSpeaking,
  isTemporary
}: {
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  chatLoading: boolean;
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  draftTranscript: string;
  setDraftTranscript: (v: string) => void;
  toolsOpen: boolean;
  setToolsOpen: (v: boolean) => void;
  hasText: boolean;
  fakeBars: number[];
  onPickImage: () => void;
  webSearchOn: boolean;
  setWebSearchOn: (v: boolean) => void;
  isAuthenticated: boolean;
  onAuthClick: () => void;
  hasMessages: boolean;
  imagePreviews: string[];
  removeImageAt: (idx: number) => void;
  onGenerateImage: () => void;
  onReadAloud?: () => void;
  onStopAudio?: () => void;
  isSpeaking?: boolean;
  isTemporary?: boolean;
}) {
  const toolsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        if (toolsOpen) setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [toolsOpen, setToolsOpen]);

  return (
    <div className="relative w-full" ref={toolsRef}>
      {toolsOpen && (
        <div className={`absolute ${hasMessages ? 'bottom-full mb-3' : 'top-full mt-2'} left-0 w-[320px] rounded-2xl bg-[#171717] border border-white/10 p-2 shadow-2xl z-50 animate-[slidePop_.15s_ease-out]`}>
          {!isAuthenticated ? (
            <div className="space-y-0.5 text-left">
              <button
                onClick={() => { onPickImage(); setToolsOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/90 hover:bg-white/5 transition-colors"
              >
                <IconPaperclip /> Add photos
              </button>
              <button
                onClick={() => { setWebSearchOn(!webSearchOn); setToolsOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${webSearchOn ? 'text-blue-400 hover:bg-blue-500/5' : 'text-white/90 hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-3"><IconGlobe /> Web search</span>
                {webSearchOn && <span className="text-blue-400 text-xs">✓</span>}
              </button>

              <div className="my-2 border-t border-white/5" />
              <p className="px-3 py-1.5 text-[11px] font-bold text-white/30 uppercase tracking-widest">Log in to use...</p>

              <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/20 cursor-not-allowed group">
                <span className="flex items-center gap-3"><IconSpark /> GPT-5</span>
                <span onClick={(e) => { e.stopPropagation(); onAuthClick(); }} className="text-[11px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer">Log in</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/20 cursor-not-allowed">
                <IconBulb /> Think longer
              </button>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/20 cursor-not-allowed">
                <IconSearch /> Deep research
              </button>
            </div>
          ) : (
            <div className="space-y-0.5 text-left">
              <button
                onClick={() => { onPickImage(); setToolsOpen(false); }}
                className="flex w-full flex-col rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                  <IconPaperclip /> Add photos & files
                </div>
                <p className="pl-8 text-[11px] text-white/40 font-normal">Upload from computer</p>
              </button>
              <button
                onClick={() => { onGenerateImage(); setToolsOpen(false); }}
                className="flex w-full flex-col rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                  <IconImageTool /> Create image
                </div>
                <p className="pl-8 text-[11px] text-white/40 font-normal">Visualize anything</p>
              </button>
              <button
                onClick={() => { setWebSearchOn(!webSearchOn); setToolsOpen(false); }}
                className={`flex w-full flex-col rounded-xl px-3 py-2 transition-colors ${webSearchOn ? 'bg-blue-500/5 text-blue-400' : 'hover:bg-white/5 text-white/90'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[14px] font-medium">
                    <IconGlobe /> Web search
                  </div>
                  {webSearchOn && <span className="text-blue-400 text-xs">✓</span>}
                </div>
                <p className="pl-8 text-[11px] opacity-60 font-normal">Find real-time news and info</p>
              </button>
              <button
                className="flex w-full flex-col rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 text-[14px] font-medium text-white/90">
                  <IconSearch /> Deep research
                </div>
                <p className="pl-8 text-[11px] text-white/40 font-normal">Get a detailed report</p>
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`w-full overflow-hidden rounded-[26px] border border-white/10 bg-[#212121] px-4 shadow-xl transition-all duration-300 hover:border-white/20 ${
          listening ? `h-[54px] flex items-center` : `h-auto min-h-[54px] flex flex-col py-2`
        }`}
      >
        {listening ? (
          <div className="grid h-full w-full grid-cols-[42px_1fr_auto] items-center gap-2">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[32px] leading-none text-[#d3d3d3] transition hover:bg-white/10 hover:text-white"
            >
              +
            </button>
            <div className="flex min-w-0 items-center overflow-hidden">
              <div className="relative flex h-[40px] w-full items-center overflow-hidden">
                <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-[repeating-linear-gradient(to_right,#787878_0_2px,transparent_2px_5px)] opacity-85" />
                <div className="relative z-10 flex h-[34px] w-full items-center gap-[2px] overflow-hidden">
                  {fakeBars.map((h, i) => (
                    <span key={i} style={{ height: `${h}px` }} className="w-[1.5px] rounded-[1px] bg-[#d8d8d8]" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 justify-self-end pr-1">
              <button
                onClick={() => {
                  stopListening();
                  setDraftTranscript("");
                }}
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[#f0f0f0] transition hover:bg-white/10"
                aria-label="Cancel dictation"
              >
                <IconX />
              </button>
              <button
                onClick={() => {
                  setInput(`${input}${input && draftTranscript ? " " : ""}${draftTranscript}`.trim());
                  stopListening();
                  setDraftTranscript("");
                }}
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[#f0f0f0] transition hover:bg-white/10"
                aria-label="Use dictation"
              >
                <IconCheck />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
                {imagePreviews.map((url, idx) => (
                  <div key={idx} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-transform hover:scale-[1.02]">
                    <img src={url} alt="upload preview" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImageAt(idx)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <IconX />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {webSearchOn && (
              <div className="px-12 pt-1 pb-0.5">
                <span className="text-[12px] font-semibold text-white/30 uppercase tracking-tight">Search the web</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setToolsOpen(!toolsOpen)} className="p-2 text-white/50 hover:text-white transition-colors shrink-0">
                <IconPlus />
              </button>

              {webSearchOn && (
                <button
                  onClick={() => setWebSearchOn(false)}
                  className="flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-white hover:bg-blue-700 transition-colors shrink-0 shadow-sm"
                >
                  <IconGlobe />
                  <span className="text-[13px] font-bold">Search</span>
                </button>
              )}

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === "Enter") {
                     e.preventDefault();
                     sendMessage();
                   }
                }}
                placeholder={isTemporary ? "Temporary chat" : webSearchOn ? "Search the web" : "Ask anything"}
                className="flex-1 bg-transparent py-2 text-[15px] text-[#ececec] outline-none placeholder:text-white/30"
              />
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                 <button onClick={startListening} className="p-2 text-white/50 hover:text-white transition-colors">
                  <IconMic />
                 </button>

                 {hasText || imagePreviews.length > 0 ? (
                  <button
                    onClick={sendMessage}
                    disabled={chatLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-all hover:brightness-90 disabled:opacity-50 shadow-sm"
                  >
                    <IconSendUp />
                  </button>
                 ) : (
                  <button
                    onClick={() => {
                      if (isSpeaking && onStopAudio) onStopAudio();
                      else if (onReadAloud) onReadAloud();
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all shadow-sm ${isSpeaking ? 'bg-white text-black animate-pulse' : 'bg-white text-black hover:brightness-90'}`}
                    title={isSpeaking ? "Stop reading" : "Read aloud last message"}
                  >
                     {isSpeaking ? (
                       <div className="flex gap-0.5">
                         <span className="w-0.5 h-3 bg-current animate-[voicePulse_1s_infinite]"></span>
                         <span className="w-0.5 h-3 bg-current animate-[voicePulse_1s_infinite_0.2s]"></span>
                         <span className="w-0.5 h-3 bg-current animate-[voicePulse_1s_infinite_0.4s]"></span>
                       </div>
                     ) : (
                       <IconVoiceBars />
                     )}
                  </button>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const COUNTRY_OPTIONS = [
    { flag: "IN", name: "India", dial: "+91", minLen: 10, maxLen: 10 },
    { flag: "US", name: "United States", dial: "+1", minLen: 10, maxLen: 10 },
    { flag: "GB", name: "United Kingdom", dial: "+44", minLen: 10, maxLen: 10 },
    { flag: "CA", name: "Canada", dial: "+1", minLen: 10, maxLen: 10 },
    { flag: "AU", name: "Australia", dial: "+61", minLen: 9, maxLen: 9 },
    { flag: "DE", name: "Germany", dial: "+49", minLen: 10, maxLen: 11 },
    { flag: "FR", name: "France", dial: "+33", minLen: 9, maxLen: 9 },
    { flag: "IT", name: "Italy", dial: "+39", minLen: 9, maxLen: 10 },
    { flag: "ES", name: "Spain", dial: "+34", minLen: 9, maxLen: 9 },
    { flag: "BR", name: "Brazil", dial: "+55", minLen: 10, maxLen: 11 },
    { flag: "MX", name: "Mexico", dial: "+52", minLen: 10, maxLen: 10 },
    { flag: "JP", name: "Japan", dial: "+81", minLen: 10, maxLen: 10 },
    { flag: "KR", name: "South Korea", dial: "+82", minLen: 9, maxLen: 10 },
    { flag: "SG", name: "Singapore", dial: "+65", minLen: 8, maxLen: 8 },
    { flag: "AE", name: "United Arab Emirates", dial: "+971", minLen: 9, maxLen: 9 },
    { flag: "ZA", name: "South Africa", dial: "+27", minLen: 9, maxLen: 9 },
  ];

  const BAR_COUNT = 108;
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [spectrum, setSpectrum] = useState<number[]>(Array.from({ length: BAR_COUNT }, () => 0));
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const [chatAlert, setChatAlert] = useState<string | null>(null);
  const [authView, setAuthView] = useState<"closed" | "entry" | "otp" | "password" | "details">("closed");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authChannel, setAuthChannel] = useState<"email" | "phone">("email");
  const [authCode, setAuthCode] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"signup" | "login">("signup");
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [detailsName, setDetailsName] = useState("");
  const [detailsAge, setDetailsAge] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"email" | "phone">("email");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_OPTIONS[0]);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compactGuestMenuOpen, setCompactGuestMenuOpen] = useState(false);
  const [hasRecents, setHasRecents] = useState(false);
  const [temporaryChat, setTemporaryChat] = useState(false);
  const [normalDraft, setNormalDraft] = useState<{ input: string; images: string[] }>({ input: "", images: [] });
  const [temporaryDraft, setTemporaryDraft] = useState<{ input: string; images: string[] }>({ input: "", images: [] });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [accountSwitchOpen, setAccountSwitchOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [recentTitles, setRecentTitles] = useState<string[]>([]);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null);
  const [providerHealthLoading, setProviderHealthLoading] = useState(false);
  const [providerHealthError, setProviderHealthError] = useState<string | null>(null);
  const [providerTestPrompt, setProviderTestPrompt] = useState("hello");
  const [providerTestResult, setProviderTestResult] = useState<DebugChatResult | null>(null);
  const [providerTestLoading, setProviderTestLoading] = useState(false);
  const authEnabled = !!supabase;
  const passwordTooShort = authPassword.trim().length < 12;
  const showPasswordError = passwordTouched && passwordTooShort;
  const smoothSpectrumRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0));
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const hasText = input.trim().length > 0;
  const displayName =
    (authUser?.user_metadata?.full_name as string | undefined) ||
    authUser?.email?.split("@")[0] ||
    "User";
  const initial = (displayName?.[0] || authUser?.email?.[0] || "U").toUpperCase();

  const setComposerInput = (value: string) => {
    setInput(value);
    if (temporaryChat) {
      setTemporaryDraft((prev) => ({ ...prev, input: value }));
    } else {
      setNormalDraft((prev) => ({ ...prev, input: value }));
    }
  };

  const buildTitleFromText = (text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return "New chat";
    return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
  };

  const saveRecentIfAuthed = (title: string) => {
    if (!session || !authUser?.id || temporaryChat) return;
    const key = `emilia_recent_chats_${authUser.id}`;
    const next = [title, ...recentTitles.filter((t) => t !== title)].slice(0, 20);
    setRecentTitles(next);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem("emilia_recent_chats", JSON.stringify(next));
    setHasRecents(next.length > 0);
  };
  const recentItems: RecentItem[] = (() => {
    const seen = new Set<string>();
    return threads
      .slice()
      .sort((a, b) => {
        const aPinned = pinnedChatIds.includes(a.id);
        const bPinned = pinnedChatIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return b.updatedAt - a.updatedAt;
      })
      .filter((t) => {
        if (seen.has(t.title)) return false;
        seen.add(t.title);
        return true;
      })
      .map((t) => ({ id: t.id, title: t.title }));
  })();

  const onTogglePin = (id: string) => {
    setPinnedChatIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      if (session && authUser?.id) {
        localStorage.setItem(`emilia_pinned_chats_${authUser.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const onArchiveRecent = (id: string) => {
    setThreads(prev => {
      const next = prev.filter(t => t.id !== id);
      saveThreads(next);
      return next;
    });
  };

  const saveThreads = (nextThreads: ChatThread[]) => {
    if (!session || !authUser?.id) return;
    localStorage.setItem(`emilia_chat_threads_${authUser.id}`, JSON.stringify(nextThreads));
  };

  const upsertThread = (title: string, nextMessages: UiMessage[]) => {
    if (!session || !authUser?.id || temporaryChat) return;
    const now = Date.now();
    setThreads((prev) => {
      let next = [...prev];
      if (!activeThreadId) {
        const created: ChatThread = { id: `t_${now}`, title, messages: nextMessages, updatedAt: now };
        next = [created, ...next];
        setActiveThreadId(created.id);
      } else {
        next = next.map((t) => (t.id === activeThreadId ? { ...t, title, messages: nextMessages, updatedAt: now } : t));
      }
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      saveThreads(next);
      return next;
    });
  };

  const HERO_QUOTES = ["Where should we begin?", "What can I help with?", "Ready when you are."];
  const [heroQuote, setHeroQuote] = useState(HERO_QUOTES[0]);

  const cycleHeroQuote = () => {
    setHeroQuote((prev) => {
      const idx = HERO_QUOTES.indexOf(prev);
      return HERO_QUOTES[(idx + 1) % HERO_QUOTES.length];
    });
  };

  useEffect(() => {
    const initialIdx = Math.floor(Math.random() * HERO_QUOTES.length);
    setHeroQuote(HERO_QUOTES[initialIdx]);
  }, []);

  const createNewChat = () => {
    setMessages([]);
    setComposerInput("");
    setImagePreviews([]);
    setActiveThreadId(null);
    setWebSearchOn(false);
    cycleHeroQuote();
  };

  const openRecentById = (id: string) => {
    const found = threads.find((t) => t.id === id);
    if (!found) return;
    setActiveThreadId(found.id);
    setMessages(found.messages);
  };

  const renameRecentById = (id: string) => {
    const target = threads.find((t) => t.id === id);
    if (!target) return;
    const nextTitle = window.prompt("Rename chat", target.title)?.trim();
    if (!nextTitle) return;
    const next = threads.map((t) => (t.id === id ? { ...t, title: nextTitle, updatedAt: Date.now() } : t));
    setThreads(next);
    saveThreads(next);
    setRecentTitles(next.map((t) => t.title).slice(0, 20));
  };

  const deleteRecentById = (id: string) => {
    const target = threads.find((t) => t.id === id);
    if (!target) return;
    const next = threads.filter((t) => t.id !== id && t.title !== target.title);
    setThreads(next);
    saveThreads(next);
    setRecentTitles(next.map((t) => t.title).slice(0, 20));
    if (activeThreadId === id) {
      setActiveThreadId(null);
      setMessages([]);
    }
  };

  const parseErrorText = async (response: Response) => {
    try {
      const raw = await response.text();
      if (!raw) return "";
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.detail === "string") return parsed.detail;
        if (typeof parsed?.error === "string") return parsed.error;
      } catch {}
      return raw;
    } catch {
      return "";
    }
  };

  const deriveChatErrorMessage = (
    status: number | null,
    detail: string,
    networkError?: unknown,
  ) => {
    if (networkError) {
      return "Backend is offline. Start backend server on port 8000 and try again.";
    }
    if (status === 429) {
      return "Rate limit reached. Please wait a moment and try again.";
    }
    if (status === 401 || status === 403 || /missing.*api[_-]?key/i.test(detail) || /api[_-]?key/i.test(detail) || /Error 401/i.test(detail)) {
      return `AI Provider Error: ${detail}. Please check your API keys in backend/.env.`;
    }
    if (status && status >= 500) {
      return `Backend Error (${status}): ${detail}. Please check backend logs.`;
    }
    return detail || "Request failed. Please try again.";
  };

  const apiBaseUrl = () => {
    const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return raw.replace(/\/api\/?$/, "");
  };

  const loadProviderHealth = async () => {
    setProviderHealthLoading(true);
    setProviderHealthError(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/api/health/providers`);
      const data = (await res.json()) as ProviderHealth;
      if (!res.ok) {
        const detail = (data as unknown as { detail?: string }).detail;
        throw new Error(typeof detail === "string" ? detail : "Unable to load provider health.");
      }
      setProviderHealth(data);
    } catch (err) {
      setProviderHealthError(err instanceof Error ? err.message : "Unable to load provider health.");
    } finally {
      setProviderHealthLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    const prompt = input.trim();
    if (!prompt) {
      setChatAlert("Enter a description in the chat bar first, then click 'Create image'.");
      return;
    }
    setGeneratingImage(true);
    setChatAlert(null);

    // Add user request to chat
    const userMsg: UiMessage = { role: "user", content: `Generate an image: ${prompt}` };
    setMessages((prev) => [...prev, userMsg]);
    setComposerInput("");

    try {
      const res = await fetch(`${apiBaseUrl()}/api/generate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Image generation failed.");
      }

      const assistantMsg: UiMessage = {
        role: "assistant",
        content: `I've generated an image based on your prompt: "${prompt}"\n\n![Generated Image](${data.url})`,
        provider: data.provider
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const assistantMsg: UiMessage = {
        role: "assistant",
        content: `Sorry, I couldn't generate that image. ${err instanceof Error ? err.message : "Request failed."}`
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Stop any current speaking
    window.speechSynthesis.cancel();

    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistantMessage) return;

    const utterance = new SpeechSynthesisUtterance(lastAssistantMessage.content);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const startEditingMessage = (idx: number) => {
    setEditingMessageIdx(idx);
    setEditingText(messages[idx].content);
  };

  const saveEditedMessage = async (idx: number) => {
    // Branching: delete everything after the edited message and regenerate
    const truncated = messages.slice(0, idx);
    const updatedUserMsg: UiMessage = { ...messages[idx], content: editingText };
    const nextMessages = [...truncated, updatedUserMsg];
    setMessages(nextMessages);
    setEditingMessageIdx(null);

    // Auto-re-send to get a new AI response for the edited prompt
    // Note: We use a small timeout to let state update if needed, but not strictly required with state setter above
    // We call a variant of sendMessage that accepts the current message state
    void triggerChatResponse(nextMessages);
  };

  const triggerChatResponse = async (currentMessages: UiMessage[]) => {
    setChatLoading(true);
    setChatAlert(null);
    const lastUserText = currentMessages[currentMessages.length - 1]?.content || "";
    saveRecentIfAuthed(buildTitleFromText(lastUserText));
    upsertThread(buildTitleFromText(lastUserText), currentMessages);

    try {
      const res = await fetch(`${apiBaseUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: webSearchOn ? "search" : "auto",
        }),
      });
      if (!res.ok) {
        const detail = await parseErrorText(res);
        throw new Error(detail || "Chat request failed");
      }
      const data = await res.json();
      const reply = data.answer || "I could not answer that yet.";

      if (data.provider === "local" && data.provider_errors?.length > 0) {
        setChatAlert(`Note: All AI providers failed. Falling back to local responses.`);
      }

      setMessages((prev) => {
        const next = [...prev, {
          role: "assistant",
          content: reply,
          provider: data.provider,
          route: data.route,
          sourceName: data.source_name,
          freshness: data.freshness
        }];
        upsertThread(buildTitleFromText(lastUserText), next);
        return next;
      });
    } catch (err) {
      setChatAlert(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setChatLoading(false);
    }
  };

  const runProviderChatTest = async () => {
    const prompt = providerTestPrompt.trim();
    if (!prompt) return;
    setProviderTestLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/api/debug/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "auto" }),
      });
      const data = (await res.json()) as DebugChatResult | { detail?: string };
      if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(typeof detail === "string" ? detail : "Debug chat request failed.");
      }
      setProviderTestResult(data as DebugChatResult);
    } catch (err) {
      setProviderTestResult({
        prompt,
        provider: null,
        route: null,
        fallback_used: true,
        provider_errors: [err instanceof Error ? err.message : "Debug chat request failed."],
        answer: "",
      });
    } finally {
      setProviderTestLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const outgoing: UiMessage = { role: "user", content: text };
    const nextMessages = [...messages, outgoing];
    setMessages(nextMessages);
    setComposerInput("");
    setChatLoading(true);
    setChatAlert(null);
    saveRecentIfAuthed(buildTitleFromText(text));
    upsertThread(buildTitleFromText(text), nextMessages);
    let failedStatus: number | null = null;
    try {
      const apiBase = apiBaseUrl();
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: webSearchOn ? "search" : "auto",
        }),
      });
      if (!res.ok) {
        failedStatus = res.status;
        const detail = await parseErrorText(res);
        throw new Error(detail || "Chat request failed");
      }
      const data = await res.json();
      const reply = typeof data.answer === "string" && data.answer.trim() ? data.answer : "I could not answer that yet.";
      const provider = typeof data.provider === "string" ? data.provider : undefined;

      // If we got errors but still returned a fallback answer, inform the user
      if (data.provider === "local" && data.provider_errors?.length > 0) {
        setChatAlert(`Note: All AI providers failed. Falling back to local responses. Errors: ${data.provider_errors.join(", ")}`);
      }
      const route = typeof data.route === "string" ? data.route : undefined;
      const sourceName = typeof data.source_name === "string" ? data.source_name : undefined;
      const freshness = typeof data.freshness === "string" ? data.freshness : undefined;
      setMessages((prev) => {
        const merged = [...prev, { role: "assistant", content: reply, provider, route, sourceName, freshness } as UiMessage];
        upsertThread(buildTitleFromText(text), merged);
        return merged;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const detail = message && message !== "Chat request failed" ? message : "";
      const alertText = deriveChatErrorMessage(failedStatus, detail, failedStatus ? undefined : err);
      setChatAlert((prev) => prev || alertText);
    } finally {
      setChatLoading(false);
    }
  };

  const copyAssistantMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {}
  };

  const exportConversation = async () => {
    const transcript = messages
      .map((message) => `${message.role === "user" ? "User" : "Emilia"}\n${message.content}`)
      .join("\n\n---\n\n");
    if (!transcript.trim()) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setChatAlert("Conversation copied as Markdown text.");
    } catch {
      setChatAlert("Unable to copy conversation right now.");
    }
  };

  const regenerateLast = async () => {
    const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const cut = messages.slice(0, lastUserIndex + 1);
    setMessages(cut);
    const text = cut[lastUserIndex].content;
    setComposerInput(text);
    await sendMessage();
  };

  const toggleTemporaryMode = () => {
    if (!temporaryChat) {
      setNormalDraft({ input, images: imagePreviews });
      setInput(temporaryDraft.input);
      setImagePreviews(temporaryDraft.images);
      setTemporaryChat(true);
      return;
    }
    temporaryDraft.images.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setTemporaryDraft({ input: "", images: [] });
    setInput(normalDraft.input);
    setImagePreviews(normalDraft.images);
    setTemporaryChat(false);
  };

  useEffect(() => {
    try {
      if (session && authUser?.id) {
        const threadRaw = localStorage.getItem(`emilia_chat_threads_${authUser.id}`);
        if (threadRaw) {
          const parsedThreads = JSON.parse(threadRaw);
          if (Array.isArray(parsedThreads)) setThreads(parsedThreads);
        } else setThreads([]);

        const pinnedRaw = localStorage.getItem(`emilia_pinned_chats_${authUser.id}`);
        if (pinnedRaw) {
          const parsedPinned = JSON.parse(pinnedRaw);
          if (Array.isArray(parsedPinned)) setPinnedChatIds(parsedPinned);
        }

        const own = localStorage.getItem(`emilia_recent_chats_${authUser.id}`);
        if (own) {
          const parsedOwn = JSON.parse(own);
          if (Array.isArray(parsedOwn)) {
            setRecentTitles(parsedOwn);
            setHasRecents(parsedOwn.length > 0);
            return;
          }
        }
      } else {
        // Clear state if not authenticated
        setThreads([]);
        setPinnedChatIds([]);
        setRecentTitles([]);
        setHasRecents(false);
      }
      const recentRaw = localStorage.getItem("emilia_recent_chats");
      setHasRecents(!!recentRaw);
    } catch {
      setHasRecents(false);
    }
  }, [session, authUser?.id]);

  useEffect(() => {
    if (debugPanelOpen && !providerHealth && !providerHealthLoading) {
      void loadProviderHealth();
    }
  }, [debugPanelOpen, providerHealth, providerHealthLoading]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[aria-label="Open profile menu"]') || target.closest('[aria-label="Log in"]')) return;
      setCompactGuestMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const probe = document.createElement("div");
    probe.className = "hidden";
    probe.style.position = "absolute";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const hiddenWorking = getComputedStyle(probe).display === "none";
    document.body.removeChild(probe);
    if (hiddenWorking) return;

    const retried = sessionStorage.getItem("emilia_css_retry") === "1";
    if (retried) return;
    sessionStorage.setItem("emilia_css_retry", "1");
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    links.forEach((link) => {
      if (link.href.includes("/_next/static/css/")) {
        const url = new URL(link.href);
        url.searchParams.set("v", String(Date.now()));
        link.href = url.toString();
      }
    });
    setTimeout(() => window.location.reload(), 180);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
      imagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            addImageFile(file, file.name || "image.png");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImageViewerOpen(false);
      if (e.key === "Escape") setAuthView("closed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      if (nextSession?.user?.user_metadata?.profile_completed) {
        setAuthView("closed");
      }
      if (nextSession?.user && !nextSession.user.user_metadata?.profile_completed) {
        setDetailsName((nextSession.user.user_metadata?.full_name as string | undefined) || "");
        setDetailsAge((nextSession.user.user_metadata?.age as string | undefined) || "");
        setAuthView("details");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("emilia_saved_accounts");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedAccounts(parsed.filter((a: any) => a && a.id && a.email));
      }
    } catch {
      setSavedAccounts([]);
    }
  }, []);

  useEffect(() => {
    if (!authUser?.id || !authUser.email) return;
    const account: SavedAccount = {
      id: authUser.id,
      email: authUser.email,
      name:
        (authUser.user_metadata?.full_name as string | undefined) ||
        authUser.email.split("@")[0],
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) || null,
      provider: (authUser.app_metadata?.provider as string | undefined) || undefined,
    };
    setSavedAccounts((prev) => {
      const next = [account, ...prev.filter((a) => a.id !== account.id)].slice(0, 8);
      localStorage.setItem("emilia_saved_accounts", JSON.stringify(next));
      return next;
    });
  }, [authUser]);

  const startAccountSwitch = (account: SavedAccount) => {
    if (account.id === authUser?.id) {
      setAccountSwitchOpen(false);
      return;
    }
    setAccountSwitchOpen(false);
    setProfileMenuOpen(false);
    if (account.provider === "google") {
      void signInWithOAuth("google", account.email);
      return;
    }
    if (account.provider === "apple") {
      void signInWithOAuth("apple", account.email);
      return;
    }
    setAuthError(null);
    setAuthNotice(`Switch account: continue as ${account.email}`);
    setAuthEmail(account.email);
    setPasswordMode("login");
    setAuthView("entry");
  };

  useEffect(() => {
    setEditDisplayName(displayName);
    setEditUsername((authUser?.user_metadata?.username as string | undefined) || authUser?.email?.split("@")[0] || "");
    setProfilePhotoUrl((authUser?.user_metadata?.avatar_url as string | undefined) || null);
  }, [displayName, authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (!authUser.user_metadata?.profile_completed) {
      setDetailsName((authUser.user_metadata?.full_name as string | undefined) || "");
      setDetailsAge((authUser.user_metadata?.age as string | undefined) || "");
      setAuthView("details");
    }
  }, [authUser]);

  const pickImage = () => fileInputRef.current?.click();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/login") { setPasswordMode("login"); setAuthView("password"); }
      else if (path === "/signup") { setPasswordMode("signup"); setAuthView("password"); }
      else if (path === "/profile") { if (session) setEditProfileOpen(true); else setAuthView("entry"); }
      else if (path === "/") { setAuthView("closed"); setEditProfileOpen(false); }
    };
    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let newPath = "/";
    if (editProfileOpen) newPath = "/profile";
    else if (authView === "password") newPath = passwordMode === "signup" ? "/signup" : "/login";
    else if (authView === "entry" || authView === "otp") newPath = "/login";

    if (window.location.pathname !== newPath) {
      window.history.pushState(null, "", newPath);
    }
  }, [authView, passwordMode, editProfileOpen]);

  const openAuth = () => {
    setAuthError(null);
    setAuthNotice(null);
    setEntryMode("email");
    setCountryMenuOpen(false);
    if (supabaseConfigError) {
      setAuthError(supabaseConfigError);
    }
    setAuthView("entry");
  };

  const getAuthRedirectUrl = () => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}`;
  };

  const notifyAuthEmailEvent = async (eventType: "post-signup" | "post-login", email: string) => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl || !email) return;
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4000);
      await fetch(`${baseUrl}/api/auth/${eventType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
    } catch {
      // Keep auth success even if notification email fails.
    }
  };

  const signInWithOAuth = async (provider: "google" | "apple", emailHint?: string) => {
    if (!supabase || supabaseConfigError) {
      setAuthError(supabaseConfigError || "Supabase client not initialized.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: emailHint ? { login_hint: emailHint } : undefined,
      },
    });
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    await signInWithOAuth(provider);
  };

  const handlePhoneLogin = () => {
    setAuthError(null);
    setAuthNotice(null);
    setEntryMode("phone");
  };

  const handleEmailMode = () => {
    setAuthError(null);
    setAuthNotice(null);
    setEntryMode("email");
  };

  const sendOtp = async () => {
    if (!supabase) return;
    const email = authEmail.trim();
    if (!email) {
      setAuthError("Enter an email address.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthChannel("email");
      setAuthNotice(`Code sent to ${email}.`);
      setAuthView("otp");
    }
    setAuthBusy(false);
  };

  const sendPhoneOtp = async () => {
    if (!supabase) return;
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits || digits.length < selectedCountry.minLen) {
      setAuthError(`Enter a valid ${selectedCountry.name} phone number.`);
      return;
    }
    const phone = `${selectedCountry.dial}${digits}`;
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthChannel("phone");
      setAuthPhone(phone);
      setAuthNotice(`Code sent to ${phone}.`);
      setAuthView("otp");
    }
    setAuthBusy(false);
  };

  const verifyOtp = async () => {
    if (!supabase) return;
    const email = authEmail.trim();
    const phone = authPhone.trim();
    const token = authCode.trim();
    if (!token || (authChannel === "email" && !email) || (authChannel === "phone" && !phone)) {
      setAuthError("Enter verification code.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: authChannel === "email" ? email : undefined,
      phone: authChannel === "phone" ? phone : undefined,
      token,
      type: authChannel === "email" ? "email" : "sms",
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthNotice("Signed in successfully.");
      setAuthView("closed");
    }
    setAuthBusy(false);
  };

  const signInWithPassword = async () => {
    if (!supabase) return;
    const email = authEmail.trim();
    const password = authPassword.trim();
    setPasswordTouched(true);
    if (!email || !password) {
      setAuthError("Enter both email and password.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setAuthNotice("Logged in successfully.");
      void notifyAuthEmailEvent("post-login", email);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signUpWithPassword = async () => {
    if (!supabase) return;
    const email = authEmail.trim();
    const password = authPassword.trim();
    setPasswordTouched(true);
    if (!email || !password) {
      setAuthError("Enter both email and password.");
      return;
    }
    if (password.length < 12) {
      setAuthError("Password must be at least 12 characters.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;

      setAuthNotice("Account created! If you don't see a details screen, check your email to confirm your account.");
      void notifyAuthEmailEvent("post-signup", email);

      if (data.user) {
        setAuthUser(data.user);
        // If email confirmation is off, this will show immediately
        setDetailsName((data.user.user_metadata?.full_name as string | undefined) || "");
        setDetailsAge((data.user.user_metadata?.age as string | undefined) || "");
        setAuthView("details");
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setProfileMenuOpen(false);
    }
    setAuthBusy(false);
  };

  const finishProfileDetails = async () => {
    if (!supabase || !authUser) return;
    const name = detailsName.trim();
    const ageNumber = Number(detailsAge.trim());
    if (!name || isNaN(ageNumber)) {
      setAuthError("Enter name and valid age.");
      return;
    }
    setAuthBusy(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        age: String(ageNumber),
        profile_completed: true,
      },
    });
    if (!error && data.user) {
      setAuthUser(data.user);
      setAuthView("closed");
    } else if (error) {
      setAuthError(error.message);
    }
    setAuthBusy(false);
  };

  const onImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    addImageFile(file, file.name);
  };

  const addImageFile = (file: File, name = "image.png") => {
    setImagePreviews((prev) => {
      const next = [...prev, URL.createObjectURL(file)];
      if (temporaryChat) setTemporaryDraft((d) => ({ ...d, images: next }));
      else setNormalDraft((d) => ({ ...d, images: next }));
      return next;
    });
  };

  const removeImageAt = (idx: number) => {
    setImagePreviews((prev) => {
      const target = prev[idx];
      if (target?.startsWith("blob:")) URL.revokeObjectURL(target);
      const next = prev.filter((_, i) => i !== idx);
      if (temporaryChat) setTemporaryDraft((d) => ({ ...d, images: next }));
      else setNormalDraft((d) => ({ ...d, images: next }));
      return next;
    });
  };

  useEffect(() => {
    chatScrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatLoading]);

  const startAudioMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        const level = sum / freqData.length / 255;
        setAudioLevel(level);
        const bands = BAR_COUNT;
        const nextSpectrum: number[] = [];
        for (let b = 0; b < bands; b++) {
          nextSpectrum.push(freqData[Math.floor(b * (freqData.length / bands))] / 255);
        }
        setSpectrum(nextSpectrum);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  const stopAudioMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    setAudioLevel(0);
    setSpectrum(Array(BAR_COUNT).fill(0));
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setDraftTranscript(text);
    };
    rec.onerror = () => stopListening();
    rec.onend = () => stopListening();
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    startAudioMeter();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    stopAudioMeter();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => {
      if (f.type.startsWith("image/")) addImageFile(f, f.name);
    });
  };

  const fakeBars = useMemo(() => spectrum.map(v => 1 + v * 30 + audioLevel * 10), [spectrum, audioLevel]);
  const toolsRef = useRef<HTMLDivElement>(null);

  return (
    <main
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="app-shell flex h-screen overflow-hidden bg-black"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach(f => {
            if (f.type.startsWith("image/")) addImageFile(f, f.name);
          });
          e.target.value = "";
        }}
      />
      {isDragOver && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 p-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black">
              <IconPlus />
            </div>
            <p className="text-xl font-medium text-white">Drop images to upload</p>
          </div>
        </div>
      )}
      <aside
        className={`app-sidebar hidden h-screen border-r border-white/[0.05] bg-[#000] lg:flex lg:flex-col transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        <Sidebar
          compact={sidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          hasRecents={hasRecents}
          compactGuestMenuOpen={compactGuestMenuOpen}
          onToggleCompactGuestMenu={() => setCompactGuestMenuOpen((v) => !v)}
          onOpenEditProfile={() => setEditProfileOpen(true)}
          accountSwitchOpen={accountSwitchOpen}
          onToggleAccountSwitch={() => setAccountSwitchOpen((v) => !v)}
          onAuthClick={openAuth}
          onSignOut={signOut}
          isAuthenticated={!!session}
          userEmail={authUser?.email}
          userName={displayName}
          profileMenuOpen={profileMenuOpen}
          onToggleProfileMenu={() => setProfileMenuOpen((v) => !v)}
          savedAccounts={savedAccounts}
          activeAccountId={authUser?.id}
          onSwitchAccount={startAccountSwitch}
          onAddAccount={openAuth}
          recentItems={recentItems}
          onNewChat={createNewChat}
          onOpenRecent={openRecentById}
          onRenameRecent={renameRecentById}
          onDeleteRecent={deleteRecentById}
          pinnedChatIds={pinnedChatIds}
          onTogglePin={onTogglePin}
          onArchiveRecent={onArchiveRecent}
          onUpgradeClick={() => setUpgradeModalOpen(true)}
        />
      </aside>

      <aside className="hidden h-screen w-[92px] border-r border-neutral-800 bg-black md:flex md:flex-col lg:hidden">
        <Sidebar compact sidebarCollapsed hasRecents={hasRecents} compactGuestMenuOpen={compactGuestMenuOpen} onToggleCompactGuestMenu={() => setCompactGuestMenuOpen((v) => !v)} onOpenEditProfile={() => setEditProfileOpen(true)} accountSwitchOpen={accountSwitchOpen} onToggleAccountSwitch={() => setAccountSwitchOpen((v) => !v)} onAuthClick={openAuth} onSignOut={signOut} isAuthenticated={!!session} userEmail={authUser?.email} userName={displayName} savedAccounts={savedAccounts} activeAccountId={authUser?.id} onSwitchAccount={startAccountSwitch} onAddAccount={openAuth} recentItems={recentItems} onNewChat={createNewChat} onOpenRecent={openRecentById} onRenameRecent={renameRecentById} onDeleteRecent={deleteRecentById} pinnedChatIds={pinnedChatIds} onTogglePin={onTogglePin} onArchiveRecent={onArchiveRecent} onUpgradeClick={() => setUpgradeModalOpen(true)} />
      </aside>

      <section className="app-main relative min-w-0 flex-1 flex flex-col bg-[#0c0d10] transition-all duration-200 h-screen overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col px-4 md:px-6 lg:px-8">
          <header className="flex shrink-0 items-center justify-between py-5 px-2">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 md:hidden" onClick={() => setOpen(true)}>
                <IconPanel />
              </button>
              <button className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[18px] font-bold text-[#ececec] transition hover:bg-white/5 group">
                <span>Emilia</span>
                <IconChevronDown className="mt-0.5 text-white/20 group-hover:text-white/40 transition-colors" />
              </button>
            </div>
            {session ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUpgradeModalOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-bold text-[#ececec] transition hover:bg-white/10"
                >
                  <IconSpark className="w-4 h-4 text-blue-400" />
                  <span>Upgrade</span>
                </button>
                <div className="relative group">
                  <button
                    onClick={toggleTemporaryMode}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition-colors ${temporaryChat ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'hover:bg-white/10'}`}
                  >
                    <IconTempChat />
                  </button>
                  <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-[#171717] border border-white/10 text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap">
                      {temporaryChat ? "Turn off temporary chat" : "Temporary chat"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => void exportConversation()}
                  disabled={!messages.length}
                  className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-white/40 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-10"
                >
                  Export
                </button>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8a600] text-[12px] font-bold text-white ml-1">
                  {initial}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={openAuth} className="h-9 px-4 text-[14px] font-semibold text-[#ececec] hover:bg-white/5 rounded-lg transition-colors">Log in</button>
                <button onClick={openAuth} className="h-9 px-4 text-[14px] font-semibold text-black bg-[#ececec] rounded-full hover:bg-white transition-colors">Sign up for free</button>
              </div>
            )}
          </header>

          <div className={`flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto hide-scrollbar`}>
            <div className={`flex w-full max-w-[800px] flex-col items-center ${messages.length > 0 ? "pt-2 pb-32" : "justify-center h-full"} px-4`}>
              {!messages.length && (
                <div className="w-full flex flex-col items-center">
                  <h2 className="mb-10 text-center text-[32px] font-semibold tracking-tight text-[#ececec] md:text-[42px] leading-tight">
                    {temporaryChat ? "Temporary Chat" : heroQuote}
                  </h2>
                  <div className="w-full max-w-[760px]">
                    <InputBar
                      input={input}
                      setInput={setComposerInput}
                      sendMessage={sendMessage}
                      chatLoading={chatLoading}
                      listening={listening}
                      startListening={startListening}
                      stopListening={stopListening}
                      draftTranscript={draftTranscript}
                      setDraftTranscript={setDraftTranscript}
                      toolsOpen={toolsOpen}
                      setToolsOpen={setToolsOpen}
                      hasText={hasText}
                      fakeBars={fakeBars}
                      onPickImage={pickImage}
                      webSearchOn={webSearchOn}
                      setWebSearchOn={setWebSearchOn}
                      isAuthenticated={!!session}
                      onAuthClick={openAuth}
                      hasMessages={messages.length > 0}
                      imagePreviews={imagePreviews}
                      removeImageAt={removeImageAt}
                      onGenerateImage={handleGenerateImage}
                      onReadAloud={handleReadAloud}
                      onStopAudio={handleStopAudio}
                      isSpeaking={isSpeaking}
                      isTemporary={temporaryChat}
                    />
                  </div>
                  {temporaryChat && (
                    <div className="mt-8 flex flex-col items-center">
                      <p className="text-center text-[16px] text-[#9a9a9a]">
                        This chat won&apos;t appear in history or be used to train our models.
                      </p>
                      <p className="mt-20 text-[12px] text-white/20">
                        For safety, we may keep a copy of this chat for up to 30 days.
                      </p>
                    </div>
                  )}
                  {!temporaryChat && (
                    <div className="mt-8 h-[24px]" />
                  )}
                </div>
              )}

              {messages.length > 0 && (
                <div className="w-full space-y-8 pb-10">
                  {messages.map((m, idx) => {
                    const isEditing = editingMessageIdx === idx;

                    return (
                      <div key={`${m.role}-${idx}`} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} w-full group`}>
                        {m.role === 'user' ? (
                          <div className="w-full flex flex-col items-end">
                            {isEditing ? (
                              <div className="w-full max-w-[90%] rounded-3xl bg-[#2f2f2f] p-4 border border-white/10 shadow-lg">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full bg-transparent text-[15px] leading-relaxed text-white outline-none min-h-[80px] resize-none"
                                  autoFocus
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                  <button onClick={() => setEditingMessageIdx(null)} className="px-4 py-1.5 rounded-full text-[13px] font-bold text-white hover:bg-white/5 transition-colors">
                                    Cancel
                                  </button>
                                  <button onClick={() => saveEditedMessage(idx)} className="px-4 py-1.5 rounded-full text-[13px] font-bold bg-white text-black hover:bg-[#ececec] transition-colors">
                                    Send
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="max-w-[75%] rounded-3xl bg-[#2f2f2f] px-5 py-3 text-[15px] leading-relaxed text-white shadow-sm border border-white/5">
                                  {m.content}
                                </div>
                                <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(m.content);
                                    }}
                                    className="p-1.5 rounded-lg text-white/30 hover:bg-white/5 hover:text-white/70 transition-all"
                                    title="Copy message"
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => startEditingMessage(idx)}
                                    className="p-1.5 rounded-lg text-white/30 hover:bg-white/5 hover:text-white/70 transition-all"
                                    title="Edit message"
                                  >
                                    <IconEdit />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="w-full max-w-[95%]">
                            <div className="text-[15.5px] leading-relaxed text-[#ececec] whitespace-pre-wrap">
                              {m.role === "assistant" ? <MarkdownMessage text={m.content} /> : m.content}
                            </div>
                            {m.content.trim() && (
                              <div className="mt-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                 <button
                                   onClick={() => {
                                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                                        window.speechSynthesis.cancel();
                                        const u = new SpeechSynthesisUtterance(m.content);
                                        window.speechSynthesis.speak(u);
                                      }
                                   }}
                                   className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/5 hover:text-white/70 transition-all border border-transparent hover:border-white/10"
                                   title="Read aloud"
                                 >
                                    <IconSpeaker className="w-4 h-4" />
                                 </button>
                                 <button
                                   onClick={() => void copyAssistantMessage(m.content)}
                                   className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/5 hover:text-white/70 transition-all border border-transparent hover:border-white/10"
                                   title="Copy"
                                 >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                 </button>
                                 <button
                                   onClick={() => {
                                      if (navigator.share) {
                                        navigator.share({ title: 'Emilia Chat', text: m.content }).catch(() => {});
                                      }
                                   }}
                                   className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/5 hover:text-white/70 transition-all border border-transparent hover:border-white/10"
                                   title="Share"
                                 >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                                 </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(chatLoading || generatingImage) && (
                    <div className="flex gap-1 items-center h-8">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                      {generatingImage && <span className="ml-2 text-[13px] text-white/40">Generating image...</span>}
                    </div>
                  )}
                  <div ref={chatScrollAnchorRef} className="h-1" />
                </div>
              )}
            </div>
          </div>

          {messages.length > 0 && (
            <div className="relative shrink-0 w-full max-w-[800px] mx-auto pb-4 px-4">
               <InputBar
                  input={input}
                  setInput={setComposerInput}
                  sendMessage={sendMessage}
                  chatLoading={chatLoading}
                  listening={listening}
                  startListening={startListening}
                  stopListening={stopListening}
                  draftTranscript={draftTranscript}
                  setDraftTranscript={setDraftTranscript}
                  toolsOpen={toolsOpen}
                  setToolsOpen={setToolsOpen}
                  hasText={hasText}
                  fakeBars={fakeBars}
                  onPickImage={pickImage}
                  webSearchOn={webSearchOn}
                  setWebSearchOn={setWebSearchOn}
                  isAuthenticated={!!session}
                  onAuthClick={openAuth}
                  hasMessages={messages.length > 0}
                  imagePreviews={imagePreviews}
                  removeImageAt={removeImageAt}
                  onGenerateImage={handleGenerateImage}
                  onReadAloud={handleReadAloud}
                  onStopAudio={handleStopAudio}
                  isSpeaking={isSpeaking}
                  isTemporary={temporaryChat}
                />
                <p className="mt-4 text-center text-[12.5px] text-white/25 leading-relaxed">
                  Emilia can make mistakes. Check important info. By using it, you agree to our <span className="underline cursor-pointer hover:text-white/40">Terms</span> & <span className="underline cursor-pointer hover:text-white/40">Privacy Policy</span>.
                </p>
            </div>
          )}
        </div>
      </section>

      {open && (
        <>
          <button className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} aria-label="Close drawer" />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-neutral-800 bg-black md:hidden">
            <div className="flex justify-end px-4 py-3">
              <button className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-white" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <Sidebar
              onAuthClick={openAuth}
              onSignOut={signOut}
              isAuthenticated={!!session}
              userEmail={authUser?.email}
              userName={displayName}
              savedAccounts={savedAccounts}
              activeAccountId={authUser?.id}
              onSwitchAccount={startAccountSwitch}
              onAddAccount={openAuth}
              recentItems={recentItems}
              onNewChat={createNewChat}
              onOpenRecent={openRecentById}
              onRenameRecent={renameRecentById}
              onDeleteRecent={deleteRecentById}
              pinnedChatIds={pinnedChatIds}
              onTogglePin={onTogglePin}
              onArchiveRecent={onArchiveRecent}
              onUpgradeClick={() => { setUpgradeModalOpen(true); setOpen(false); }}
            />
          </aside>
        </>
      )}

      {authView === "details" && session && (
        <div className="fixed inset-0 z-[128] grid place-items-center overflow-hidden bg-[#242529] p-4 text-white">
          <div className="w-[95vw] max-w-[430px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#23262b] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)] md:w-[90vw] md:max-w-[410px] md:px-6 md:py-7">
            <div className="mb-6 text-[28px] font-semibold">Emilia</div>
            <h2 className="mb-4 text-[38px] font-medium leading-tight md:text-[42px]">How old are you?</h2>
            <p className="mb-6 text-[16px] leading-[1.55] text-[#d6d6d6]">
              This helps us personalize your experience and provide the right settings, in line with our{" "}
              <span className="underline">Privacy Policy</span>.
            </p>
            <label className="mb-2 block text-[14px] text-[#9ab2ff]">Full name</label>
            <input
              value={detailsName}
              onChange={(e) => setDetailsName(e.target.value)}
              className="h-[50px] w-full rounded-[14px] border border-white/12 bg-[#2b2e33] px-4 text-[16px] outline-none"
            />
            <input
              value={detailsAge}
              onChange={(e) => setDetailsAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="Age"
              className="mt-4 h-[50px] w-full rounded-[14px] border border-white/10 bg-[#2b2e33] px-4 text-[16px] outline-none placeholder:text-[#8f8f8f]"
            />
            <p className="mt-6 text-center text-[14px] leading-[1.5] text-[#d6d6d6]">
              By clicking "Finish creating account", you agree to our <span className="underline">Terms</span> and have read our{" "}
              <span className="underline">Privacy Policy</span>.
            </p>
            <button
              onClick={() => void finishProfileDetails()}
              disabled={authBusy}
              className="mt-6 h-[52px] w-full rounded-[14px] bg-[#ececec] text-[16px] font-semibold text-black disabled:opacity-70"
            >
              {authBusy ? "Saving..." : "Finish creating account"}
            </button>
            {authError && <p className="mt-4 text-center text-[13px] text-[#ff9d9d]">{authError}</p>}
          </div>
        </div>
      )}

      {authView === "entry" && (
        <div className="fixed inset-0 z-[125] grid place-items-center overflow-hidden bg-black/65 p-4 backdrop-blur-[2px]">
          <div className={`w-[95vw] max-w-[430px] rounded-[24px] border border-white/10 bg-gradient-to-b from-[#25272c] to-[#212226] px-5 py-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.5)] md:w-[90vw] md:max-w-[410px] md:px-6 md:py-7 ${entryMode === "phone" ? "max-h-[calc(100vh-32px)] overflow-y-auto" : ""}`}>
            <div className="mb-3 flex items-center justify-end">
              <button onClick={() => setAuthView("closed")} className="text-[28px] leading-none text-white/90 transition hover:opacity-80">x</button>
            </div>
            <h2 className="mb-3 text-center text-[38px] font-medium leading-[1.08] md:text-[42px]">Log in or sign up</h2>
            {supabaseConfigError && (
              <div className="mb-6 rounded-xl bg-red-500/10 p-3 text-[13px] text-[#ff9d9d] border border-red-500/20 text-center">
                <strong>Configuration Required:</strong><br/>
                Please update your <code>frontend/.env.local</code> with your actual Supabase credentials.
              </div>
            )}
            <p className="mx-auto mb-6 max-w-[470px] text-center text-[16px] leading-[1.45] text-[#d8d8d8]">
              You&rsquo;ll get smarter responses and can upload files, images, and more.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => void handleOAuthLogin("google")}
                disabled={authBusy || !!supabaseConfigError}
                className="group h-[52px] w-full rounded-[14px] border border-white/15 bg-[#36383d] px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#3f4248] disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-3">
                  <IconGoogleMark />
                  <span>Continue with Google</span>
                </span>
              </button>
              <button
                onClick={() => void handleOAuthLogin("apple")}
                disabled={authBusy || !!supabaseConfigError}
                className="group h-[52px] w-full rounded-[14px] border border-white/15 bg-[#36383d] px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#3f4248] disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-3">
                  <IconAppleMark />
                  <span>Continue with Apple</span>
                </span>
              </button>
              <button
                onClick={entryMode === "phone" ? handleEmailMode : handlePhoneLogin}
                disabled={!!supabaseConfigError}
                className="group h-[52px] w-full rounded-[14px] border border-white/15 bg-[#36383d] px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#3f4248] disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-3">
                  {entryMode === "phone" ? <IconEmailMark /> : <IconPhoneMark />}
                  <span>{entryMode === "phone" ? "Continue with email" : "Continue with phone"}</span>
                </span>
              </button>
            </div>
            <div className="my-6 flex items-center gap-4 text-[#8f8f8f]">
              <div className="h-px flex-1 bg-white/16" />
              <span className="text-[14px] font-medium tracking-wide">OR</span>
              <div className="h-px flex-1 bg-white/16" />
            </div>
            {entryMode === "email" ? (
              <>
                <input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email address"
                  className="h-[50px] w-full rounded-[14px] border border-white/12 bg-[#2f3136] px-4 text-[16px] outline-none placeholder:text-[#9a9a9a] focus:border-white"
                />
                <button
                  onClick={() => {
                    if (!authEmail.trim()) {
                      setAuthError("Enter your email first.");
                      return;
                    }
                    setPasswordMode("signup");
                    setPasswordTouched(false);
                    setAuthError(null);
                    setAuthNotice(null);
                    setAuthView("password");
                  }}
                  disabled={authBusy || !!supabaseConfigError}
                  className="mt-4 h-[52px] w-full rounded-[14px] bg-[#ececee] text-[16px] font-semibold text-black transition-all duration-200 hover:brightness-95 disabled:opacity-70"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  {countryMenuOpen && (
                    <div className="absolute -top-[290px] left-0 z-20 h-[280px] w-full overflow-y-auto rounded-[18px] border border-white/15 bg-[#3a3c42] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                      {COUNTRY_OPTIONS.map((country) => (
                        <button
                          key={`${country.name}-${country.dial}`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setCountryMenuOpen(false);
                          }}
                          className="flex h-[44px] w-full items-center gap-3 rounded-[12px] px-4 text-left text-[15px] text-white transition hover:bg-white/10"
                        >
                          <span className="text-[22px]">{country.flag}</span>
                          <span>{country.name} {country.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setCountryMenuOpen((v) => !v)}
                    className="flex h-[50px] w-full items-center justify-between rounded-[14px] border border-white/20 bg-[#2f3136] px-4 text-[15px] transition hover:bg-[#35383e]"
                  >
                    <span>{selectedCountry.name} ({selectedCountry.dial})</span>
                    <span className="text-white/95">{countryMenuOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                  </button>
                </div>
                <div className="mt-3 flex h-[50px] w-full items-center rounded-[14px] border border-white/12 bg-[#2f3136] px-4">
                  <span className="mr-2 text-[15px] text-[#d8d8d8]">{selectedCountry.dial}</span>
                  <input
                    value={phoneNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, selectedCountry.maxLen);
                      setPhoneNumber(digits);
                    }}
                    placeholder="Phone number"
                    inputMode="numeric"
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#9a9a9a]"
                  />
                </div>
                <p className="mt-2 text-[12px] text-white/60">
                  {selectedCountry.minLen === selectedCountry.maxLen
                    ? `Enter ${selectedCountry.minLen} digits`
                    : `Enter ${selectedCountry.minLen}-${selectedCountry.maxLen} digits`}
                </p>
                <button
                  onClick={() => void sendPhoneOtp()}
                  disabled={authBusy || !!supabaseConfigError}
                  className="mt-4 h-[52px] w-full rounded-[14px] bg-[#ececee] text-[16px] font-semibold text-black transition-all duration-200 hover:brightness-95 disabled:opacity-70"
                >
                  {authBusy ? "Sending..." : "Continue"}
                </button>
              </>
            )}
            {authError && <p className="mt-4 text-center text-[13px] text-[#ff9d9d]">{authError}</p>}
            {authNotice && <p className="mt-2 text-center text-[13px] text-[#9fffbc]">{authNotice}</p>}
          </div>
        </div>
      )}

      {authView === "otp" && (
        <div className="fixed inset-0 z-[126] grid place-items-center overflow-hidden bg-[#242529] p-4 text-white">
          <div className="w-[95vw] max-w-[430px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#23262b] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)] md:w-[90vw] md:max-w-[410px] md:px-6 md:py-7">
            <div className="mb-6 text-[28px] font-semibold">Emilia</div>
            <h2 className="mb-4 text-[38px] font-medium leading-tight md:text-[42px]">Check your inbox</h2>
            <p className="mb-6 text-[16px] text-[#d6d6d6]">
              Enter the verification code we just sent to {authChannel === "phone" ? authPhone || "your phone" : authEmail || "your email"}.
            </p>
            <label className="mb-2 block text-[14px] text-[#9ab2ff]">Code</label>
            <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} className="h-[50px] w-full rounded-[14px] border border-[#7f95ff] bg-transparent px-4 text-[16px] outline-none" />
            <button onClick={() => void verifyOtp()} disabled={authBusy || !!supabaseConfigError} className="mt-4 h-[52px] w-full rounded-[14px] bg-[#ececec] text-[16px] font-semibold text-black disabled:opacity-70">{authBusy ? "Verifying..." : "Verify code"}</button>
            <button
              onClick={() => void (authChannel === "phone" ? sendPhoneOtp() : sendOtp())}
              disabled={authBusy || !!supabaseConfigError}
              className="mt-4 w-full text-center text-[14px] text-[#dfdfdf] disabled:opacity-70"
            >
              {authChannel === "phone" ? "Resend SMS" : "Resend email"}
            </button>
            {authError && <p className="mt-4 text-center text-[13px] text-[#ff9d9d]">{authError}</p>}
            {authNotice && <p className="mt-2 text-center text-[13px] text-[#9fffbc]">{authNotice}</p>}
            <div className="my-6 flex items-center gap-4 text-[#cfcfcf]">
              <div className="h-px flex-1 bg-white/10" />
              <span>OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <button
              onClick={() => {
                if (!authEmail.trim()) {
                  setAuthError("Enter your email first.");
                  setAuthView("entry");
                  return;
                }
                setPasswordTouched(false);
                setPasswordMode("signup");
                setAuthView("password");
              }}
              className="h-[52px] w-full rounded-[14px] border border-white/10 text-[16px] font-medium"
            >
              Continue with password
            </button>
          </div>
        </div>
      )}

      {authView === "password" && (
        <div className="fixed inset-0 z-[127] grid place-items-center overflow-hidden bg-[#242529] p-4 text-white">
          <div className="w-[95vw] max-w-[430px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#23262b] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)] md:w-[90vw] md:max-w-[410px] md:px-6 md:py-7">
            <div className="mb-6 text-[28px] font-semibold">Emilia</div>
            <h2 className="mb-4 text-[38px] font-medium leading-tight md:text-[42px]">
              {passwordMode === "signup" ? "Create a password" : "Enter your password"}
            </h2>
            <p className="mb-6 text-[16px] text-[#d6d6d6]">
              {passwordMode === "signup"
                ? "You'll use this password to log in to Emilia and other assistant features."
                : "Welcome back! Please enter your password to continue."}
            </p>
            <label className="mb-2 block text-[14px] text-[#9fb4ec]">Email address</label>
            <div className="mb-5 flex h-[50px] items-center justify-between rounded-[14px] border border-white/10 px-4 text-[16px]">
              <span>{authEmail || "your@email.com"}</span>
              <button
                onClick={() => {
                  setPasswordTouched(false);
                  setAuthView("entry");
                }}
                className="text-[#9ab2ff]"
              >
                Edit
              </button>
            </div>
            <label className={`mb-2 block text-[14px] ${showPasswordError ? "text-[#ff2938]" : "text-[#9ab2ff]"}`}>Password</label>
            <div className={`flex h-[50px] items-center rounded-[14px] border px-4 ${showPasswordError ? "border-[#ff0018]" : "border-[#7f95ff]"}`}>
              <input
                type={showPassword ? "text" : "password"}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                className="w-full bg-transparent text-[16px] outline-none"
              />
              <button onClick={() => setShowPassword((v) => !v)} className="text-white/90">
                <IconEye />
              </button>
            </div>
            {showPasswordError && (
              <div className="mt-5 rounded-[12px] border border-white/25 p-4">
                <p className="text-[14px]">Your password must contain:</p>
                <p className="mt-3 text-[14px] text-[#ff2a37]">X   At least 12 characters</p>
              </div>
            )}
            <button
              onClick={() => void (passwordMode === "signup" ? signUpWithPassword() : signInWithPassword())}
              disabled={authBusy || !!supabaseConfigError}
              className="mt-5 h-[52px] w-full rounded-[14px] bg-[#ececec] text-[16px] font-semibold text-black disabled:opacity-70"
            >
              {authBusy ? "Working..." : passwordMode === "signup" ? "Create account" : "Log in"}
            </button>
            <button
              onClick={() => setPasswordMode((mode) => (mode === "signup" ? "login" : "signup"))}
              className="mt-3 h-[50px] w-full rounded-[14px] border border-white/10 text-[15px] font-medium text-white/90 transition hover:bg-white/5"
            >
              {passwordMode === "signup" ? "Already have an account? Log in" : "Need a new account? Create one"}
            </button>
            {authError && <p className="mt-4 text-center text-[13px] text-[#ff9d9d]">{authError}</p>}
            {authNotice && <p className="mt-2 text-center text-[13px] text-[#9fffbc]">{authNotice}</p>}
            <div className="my-6 flex items-center gap-4 text-[#cfcfcf]">
              <div className="h-px flex-1 bg-white/10" />
              <span>OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <button onClick={() => setAuthView("otp")} className="h-[52px] w-full rounded-[14px] border border-white/10 text-[16px] font-medium">Sign up with a one-time code</button>
          </div>
        </div>
      )}

      {editProfileOpen && (
        <div className="fixed inset-0 z-[138] flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[#171717] p-8 text-white shadow-2xl animate-[slidePop_.2s_ease-out] hide-scrollbar">
            <h3 className="mb-6 text-[22px] font-bold">Edit profile</h3>
            <div className="mb-8 flex items-center justify-center">
              <div className="relative group">
                <div className="flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full bg-[#343541] text-[56px] font-bold text-white shadow-inner">
                  {profilePhotoUrl ? <img src={profilePhotoUrl} alt="avatar" className="h-full w-full object-cover" /> : (editDisplayName?.[0] || "U").toUpperCase()}
                </div>
                <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#212121] shadow-xl hover:bg-[#2f2f2f] transition-all hover:scale-105">
                  <IconImageTool />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setProfilePhotoUrl(url);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#2f2f2f] px-5 py-3.5 border border-transparent focus-within:border-white/10 transition-all">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/20 mb-1">Display name</p>
                <input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-transparent text-[18px] font-medium outline-none text-[#ececec]"
                  placeholder="Enter your name"
                />
              </div>
              <div className="rounded-2xl bg-[#2f2f2f] px-5 py-3.5 border border-transparent focus-within:border-white/10 transition-all">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/20 mb-1">Username</p>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                  className="w-full bg-transparent text-[18px] font-medium outline-none text-[#ececec]"
                  placeholder="Choose a username"
                />
              </div>
            </div>
            <p className="mt-6 text-center text-[13px] text-white/20">Your profile helps people recognize you in group chats.</p>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditProfileOpen(false)}
                className="h-11 rounded-full border border-white/10 px-6 text-[14px] font-bold text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!supabase || !authUser) {
                    setEditProfileOpen(false);
                    return;
                  }
                  setAuthBusy(true);
                  setAuthError(null);
                  try {
                    const { data, error } = await supabase.auth.updateUser({
                      data: {
                        full_name: editDisplayName.trim() || displayName,
                        username: editUsername.trim() || authUser.email?.split("@")[0] || "user",
                        avatar_url: profilePhotoUrl,
                      },
                    });
                    if (error) throw error;
                    if (data.user) setAuthUser(data.user);
                    setProfileMenuOpen(false);
                    setEditProfileOpen(false);
                  } catch (err) {
                    setAuthError(err instanceof Error ? err.message : "Failed to update profile.");
                  } finally {
                    setAuthBusy(false);
                  }
                }}
                disabled={authBusy}
                className="h-11 rounded-full bg-white px-8 text-[14px] font-bold text-black hover:bg-[#ececec] transition-all shadow-lg disabled:opacity-50"
              >
                {authBusy ? "Saving..." : "Save"}
              </button>
            </div>
            {authError && <p className="mt-4 text-center text-[13px] text-[#ff9d9d]">{authError}</p>}
          </div>
        </div>
      )}

      {uploadAlert && (
        <div className="fixed left-1/2 top-5 z-[120] -translate-x-1/2 rounded-xl bg-[#ef2f2f] px-5 py-3 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <span>!</span>
            <span>{uploadAlert}</span>
            <button onClick={() => setUploadAlert(null)} className="ml-2 text-xl leading-none">x</button>
          </div>
        </div>
      )}

      {chatAlert && (
        <div className="fixed left-1/2 top-20 z-[121] -translate-x-1/2 rounded-xl border border-[#ff6f6f]/60 bg-[#3a1616]/95 px-5 py-3 text-white shadow-[0_16px_35px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <span>!</span>
            <span>{chatAlert}</span>
            <button onClick={() => setChatAlert(null)} className="ml-2 text-xl leading-none">x</button>
          </div>
        </div>
      )}

      {debugPanelOpen && (
        <div className="fixed inset-0 z-[122] bg-black/70 backdrop-blur-[2px]">
          <div className="mx-auto mt-[8vh] w-[92vw] max-w-[780px] rounded-[26px] border border-white/10 bg-[#25262a] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[28px] font-semibold">Provider Debug</h3>
                <p className="mt-1 text-[15px] text-white/65">Check which keys Emilia can see and test a prompt end-to-end.</p>
              </div>
              <button onClick={() => setDebugPanelOpen(false)} className="rounded-full px-3 py-1 text-[18px] text-white/80 transition hover:bg-white/10">×</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-[#2c2d31] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold">Loaded Keys</p>
                  <button onClick={() => void loadProviderHealth()} className="rounded-full border border-white/10 px-3 py-1 text-[13px] text-white/80 transition hover:bg-white/10">
                    Refresh
                  </button>
                </div>
                {providerHealthLoading ? (
                  <p className="mt-4 text-[14px] text-white/60">Loading provider health...</p>
                ) : providerHealthError ? (
                  <p className="mt-4 text-[14px] text-[#ff9b9b]">{providerHealthError}</p>
                ) : (
                  <div className="mt-4 space-y-2 text-[14px] text-white/85">
                    {Object.entries(providerHealth?.keys_loaded || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span className="capitalize">{key}</span>
                        <span className={value ? "text-[#8cffb4]" : "text-white/45"}>{value ? "Loaded" : "Missing"}</span>
                      </div>
                    ))}
                    <div className="rounded-xl bg-white/5 px-3 py-2">
                      <span className="text-white/70">Web search:</span> {providerHealth?.web_search_available ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#2c2d31] p-4">
                <p className="text-[16px] font-semibold">Test a Prompt</p>
                <textarea
                  value={providerTestPrompt}
                  onChange={(e) => setProviderTestPrompt(e.target.value)}
                  className="mt-4 h-[120px] w-full rounded-2xl border border-white/10 bg-[#212225] p-3 text-[15px] outline-none placeholder:text-white/35"
                  placeholder="Ask Emilia something..."
                />
                <button
                  onClick={() => void runProviderChatTest()}
                  disabled={providerTestLoading}
                  className="mt-3 h-11 rounded-full bg-[#ececee] px-5 text-[14px] font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
                >
                  {providerTestLoading ? "Testing..." : "Run debug chat"}
                </button>
                {providerTestResult && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#212225] p-4 text-[14px] leading-relaxed text-white/85">
                    <p><span className="text-white/55">Route:</span> {providerTestResult.route || "n/a"}</p>
                    <p><span className="text-white/55">Provider:</span> {providerTestResult.provider || "n/a"}</p>
                    <p><span className="text-white/55">Source:</span> {(providerTestResult.source_name || providerTestResult.freshness || "n/a") as string}</p>
                    <p><span className="text-white/55">Fallback:</span> {providerTestResult.fallback_used ? "yes" : "no"}</p>
                    {providerTestResult.provider_errors?.length > 0 && (
                      <p className="mt-2 text-[#ffb4b4]"><span className="text-white/55">Errors:</span> {providerTestResult.provider_errors.join(" | ")}</p>
                    )}
                    <div className="mt-3 rounded-xl bg-black/30 p-3">
                      <p className="text-white/55">Answer</p>
                      <p className="mt-1 whitespace-pre-wrap">{providerTestResult.answer || "No answer returned."}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {imageViewerOpen && activeViewerImage && (
        <div className="fixed inset-0 z-[100]">
          <button
            className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              e.preventDefault();
              setImageViewerOpen(false);
            }}
            aria-label="Close image preview backdrop"
          />
          <div className="relative z-[101] flex h-full w-full items-center justify-center p-6">
            <img
              src={activeViewerImage}
              alt="Image preview"
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
            />
          </div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageViewerOpen(false);
            }}
            className="absolute right-6 top-6 z-[102] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
            aria-label="Close image preview"
          >
            <IconX />
          </button>
        </div>
      )}
      {upgradeModalOpen && (
        <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      )}
    </main>
  );
}
