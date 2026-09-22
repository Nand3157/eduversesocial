"use client";

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, CloudOff, ImageIcon, Mic, Send, Sparkles, Cpu, Globe, Loader2, Square, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SPRING_SOFT } from "@/components/motion-variants";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { useVoiceRecorder } from "@/components/dashboard/use-voice-recorder";
import { VOICE_LANGUAGES } from "@/lib/ai/voice-input";

type Message = {
  role: "assistant" | "user";
  content: string;
  image?: string;
  provider?: string;
};

type Conversation = { id: string; title: string; updated_at: string };

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const prompts = [
  "Analyze my Instagram Reels save rate",
  "Draft a 5-slide carousel for Threads & IG",
  "When is my peak Meta Graph posting window?",
  "Why did my last carousel perform well?"
];

const welcome: Message = {
  role: "assistant",
  content: "I've reviewed your latest audience signals. What would you like to explore?"
};

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

const FormattedMarkdown = React.memo(function FormattedMarkdown({ content }: { content: string }) {
  if (!content) return <span className="animate-pulse opacity-60">Thinking…</span>;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <p key={i} className="mb-1 mt-3 text-xs font-bold text-primary">
          {formatInline(trimmed.slice(5))}
        </p>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <p key={i} className="mb-1.5 mt-3.5 text-xs font-bold uppercase tracking-wider text-primary">
          {formatInline(trimmed.slice(4))}
        </p>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <p key={i} className="mb-1 mt-4 text-sm font-bold text-ink">
          {formatInline(trimmed.slice(3))}
        </p>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="my-2 rounded-r-lg border-l border-primary/60 bg-accent-soft p-2.5 text-xs leading-relaxed text-ink"
        >
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    if (trimmed === "---") {
      elements.push(<hr key={i} className="my-3 border-borderSoft" />);
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="my-1.5 flex items-start gap-2 text-sm leading-relaxed">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-primary">
            {numMatch[1]}
          </span>
          <div className="flex-1 text-ink">{formatInline(numMatch[2])}</div>
        </div>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={i} className="my-1 flex items-start gap-2 pl-1 text-sm leading-relaxed text-ink">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <div className="flex-1">{formatInline(trimmed.slice(2))}</div>
        </div>
      );
      return;
    }

    elements.push(
      <p key={i} className="my-1 text-sm leading-relaxed text-ink">
        {formatInline(trimmed)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
});

/**
 * Live input meter. It is deliberately the ONLY thing that reacts to the
 * recorder's per-frame amplitude: the level arrives via a listener bus and is
 * written straight to the DOM (style transforms), so no React state updates —
 * and no re-reconciliation of the message tree — happen while recording.
 */
const LevelMeter = React.memo(function LevelMeter({
  onLevel
}: {
  onLevel: (listener: (level: number) => void) => () => void;
}) {
  const haloRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onLevel((level) => {
      if (haloRef.current) haloRef.current.style.transform = `scale(${1 + level})`;
      if (trackRef.current) trackRef.current.style.width = `${Math.round(level * 100)}%`;
    });
  }, [onLevel]);

  return (
    <>
      <span className="relative grid h-8 w-8 shrink-0 place-items-center">
        <span ref={haloRef} className="absolute inset-0 rounded-full bg-danger/20" aria-hidden="true" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-danger" />
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-borderSoft">
        <div ref={trackRef} className="h-full rounded-full bg-primary transition-[width] duration-100" />
      </div>
    </>
  );
});

// Shared by the desktop aside and the mobile switcher so both stay in sync.
function ConversationItems({
  activeId,
  conversations,
  loading,
  onSelect
}: {
  activeId?: string;
  conversations: Conversation[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) return <p className="mt-2 text-xs leading-5 text-mutedText">Loading…</p>;
  if (conversations.length === 0) {
    return <p className="mt-2 text-xs leading-5 text-mutedText">Your latest conversation is restored automatically.</p>;
  }
  return (
    <ul className="mt-2 space-y-1">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <button
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? "true" : undefined}
              className={`w-full touch-manipulation rounded-lg px-2.5 py-2 text-left text-xs transition focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                active ? "bg-ink text-background" : "text-mutedText hover:bg-card hover:text-ink"
              }`}
            >
              <span className="block truncate font-medium">{conversation.title || "New conversation"}</span>
              <span className={`mt-0.5 block text-[10px] ${active ? "text-background/60" : "text-faintText"}`}>{timeAgo(conversation.updated_at)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ChatInterface() {
  const reduceMotion = useReducedMotion();
  const { data: analytics } = useAnalytics();
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  // Neutral until /api/ai/status confirms the provider — avoids displaying an
  // unverified product claim if the status check fails.
  const [activeProvider, setActiveProvider] = useState<string>("AI assistant");
  const [imageError, setImageError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  // Mobile-only disclosure for the conversation list (the desktop aside is lg+).
  const [conversationsOpen, setConversationsOpen] = useState(false);
  // Server reports "saving is down" via X-Chat-Persistence: unavailable —
  // surfaced as a non-blocking notice instead of being silently dropped.
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const [showSources, setShowSources] = useState<Record<number, boolean>>({});

  // Voice input (Gemini 3.5 Transcribe). The chosen code is only a hint — the
  // model detects the language on its own and follows code-switching.
  const [languageCode, setLanguageCode] = useState("auto");
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const transcribeClip = async (audioDataUrl: string) => {
    setTranscribing(true);
    setVoiceError(null);
    try {
      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: audioDataUrl, languageCode })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not transcribe the recording. Try again.");
      }
      const text = (payload?.text as string | undefined)?.trim();
      if (!text) {
        throw new Error("No speech was detected in the recording.");
      }
      setInput((current) => (current ? `${current} ${text}` : text));
      textareaRef.current?.focus();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Could not transcribe the recording.");
    } finally {
      setTranscribing(false);
    }
  };

  const recorder = useVoiceRecorder(transcribeClip);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Bumped whenever the visible conversation changes (switch or new). A send
  // captures the value when it starts and may only write while it still matches,
  // so a superseded stream can never clobber the newly opened messages — while
  // replies and errors for the *current* view always render.
  const viewGenerationRef = useRef(0);
  // Streaming state: the answer accumulates in a ref and renders on a timer so
  // a burst of network chunks does not re-parse the whole markdown answer on
  // every chunk (O(n^2) work for long replies).
  const answerRef = useRef("");
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshConversations = () => {
    fetch("/api/chat?list=1", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.conversations) setConversations(data.conversations as Conversation[]);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    fetch("/api/chat")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.conversations) setConversations(data.conversations as Conversation[]);
        if (data?.conversationId && data.messages?.length) {
          setConversationId(data.conversationId);
          setMessages(data.messages as Message[]);
        }
      })
      .catch(() => undefined);
  }, []);

  const openConversation = async (id: string) => {
    if (loadingConversation || id === conversationId) return;
    setLoadingConversation(true);
    viewGenerationRef.current += 1;
    try {
      const response = await fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.messages) {
        setConversationId(id);
        setMessages(data.messages as Message[]);
        setInput("");
        setImagePreview(null);
        setPersistenceWarning(false);
      }
    } catch {
      // Keep the current conversation on failure.
    } finally {
      setLoadingConversation(false);
    }
  };

  const startNewConversation = () => {
    viewGenerationRef.current += 1;
    setConversationId(undefined);
    setMessages([welcome]);
    setInput("");
    setImagePreview(null);
    setConversationsOpen(false);
    setPersistenceWarning(false);
  };

  useEffect(() => {
    fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.displayName) setActiveProvider(data.displayName);
      })
      .catch(() => undefined);
  }, []);

  const prevMessageCountRef = useRef(messages.length);
  // Autoscroll only when the reader is already near the bottom — scrolling to
  // the newest message must never yank someone reading earlier history.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const isNewMessage = messages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    const container = scrollContainerRef.current;
    const nearBottom =
      !container ||
      container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    if (!nearBottom && !isNewMessage) return;
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : isNewMessage ? "smooth" : "auto" });
  }, [messages, reduceMotion]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Clear any pending stream render when the component unmounts mid-stream so
  // setMessages never fires after navigation away.
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (file.size > 4 * 1024 * 1024) {
      setImageError("Image must be under 4 MB — choose a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeImage() {
    setImagePreview(null);
    setImageError(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Ignore Enter during IME composition (candidate selection) so Japanese,
    // Korean and Chinese input does not send the message prematurely.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!thinking && (input.trim() || imagePreview)) {
        handleSubmit();
      }
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if ((!question && !imagePreview) || thinking) return;

    const userMessage: Message = {
      role: "user",
      content: question || "(image attached)",
      ...(imagePreview ? { image: imagePreview } : {})
    };

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setImagePreview(null);
    setThinking(true);
    // Any conversation switch from here on invalidates this stream's writes.
    const generation = viewGenerationRef.current;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: nextMessages })
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to generate a response. Check your connection and try again.");
      }

      const providerHeader = response.headers.get("X-AI-Provider");
      const modelHeader = response.headers.get("X-AI-Model");
      if (providerHeader === "gemini" || modelHeader) setActiveProvider(modelHeader ?? "Gemini");

      setConversationId(response.headers.get("X-Conversation-ID") ?? conversationId);
      // Persistence failures are visible: the server kept answering the AI
      // stream but could not save the turn (workspace/DB unavailable).
      setPersistenceWarning(response.headers.get("X-Chat-Persistence") === "unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      answerRef.current = "";
      const renderStream = () => {
        // If the user opened a different conversation while streaming, drop the
        // render into the old one (the server still persists the answer to the
        // original conversation).
        if (viewGenerationRef.current !== generation) return;
        setMessages([
          ...nextMessages,
          { role: "assistant", content: answerRef.current, provider: providerHeader ?? "ai" }
        ]);
      };
      const scheduleRender = () => {
        if (streamTimerRef.current) return;
        streamTimerRef.current = setTimeout(() => {
          streamTimerRef.current = null;
          renderStream();
        }, 100);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answerRef.current += decoder.decode(value, { stream: true });
        scheduleRender();
      }
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      renderStream();

      if (!answerRef.current) throw new Error("The AI engine returned an empty reply. Rephrase your question and try again.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate a response.";
      if (viewGenerationRef.current === generation) {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: `I couldn't complete that request. ${message}` }
        ]);
      }
    } finally {
      setThinking(false);
      refreshConversations();
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="grid h-[calc(100dvh_-_160px_-_env(safe-area-inset-bottom))] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-borderSoft bg-card shadow-sm sm:h-[calc(100dvh_-_168px_-_env(safe-area-inset-bottom))] lg:h-[calc(100dvh-150px)] lg:grid-cols-[240px_1fr] lg:grid-rows-[minmax(0,1fr)]">
      {/* Compact conversation switcher for phones/tablets — the aside below is lg+ only */}
      <div className="max-h-[55dvh] overflow-y-auto border-b border-borderSoft bg-surface p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Button className="bg-ink text-background hover:bg-ink/90" onClick={startNewConversation} size="sm">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            New conversation
          </Button>
          <Button
            aria-controls="mobile-conversation-list"
            aria-expanded={conversationsOpen}
            className="flex-1 justify-between"
            onClick={() => setConversationsOpen((open) => !open)}
            size="sm"
            variant="secondary"
          >
            <span>Saved conversations ({conversations.length})</span>
            <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${conversationsOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>
        {conversationsOpen && (
          <div className="mt-3 max-h-[55vh] overflow-y-auto rounded-xl border border-borderSoft bg-card p-2" id="mobile-conversation-list">
            <ConversationItems
              activeId={conversationId}
              conversations={conversations}
              loading={loadingConversation}
              onSelect={(id) => {
                setConversationsOpen(false);
                void openConversation(id);
              }}
            />
          </div>
        )}
      </div>

      {/* Sidebar - ice to match Atlas, with separation */}
      <aside className="hidden overflow-y-auto border-r border-borderSoft bg-surface p-4 lg:block">
        <Button
          className="w-full bg-ink text-background hover:bg-ink/90"
          onClick={startNewConversation}
          size="sm"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          New conversation
        </Button>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wider text-mutedText">
          Saved conversations
        </p>
        <ConversationItems activeId={conversationId} conversations={conversations} loading={loadingConversation} onSelect={(id) => void openConversation(id)} />

        <div className="mt-6 rounded-xl border border-borderSoft bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Cpu aria-hidden="true" className="h-3.5 w-3.5" />
            Active AI engine
          </div>
          <p className="mt-1 text-xs text-mutedText">{activeProvider}</p>
        </div>

        <div className="mt-5 rounded-xl border border-borderSoft bg-card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mutedText">Tips</p>
          <ul className="mt-2 space-y-1.5 text-xs text-mutedText">
            <li>
              <strong className="text-ink">Enter</strong> — send message
            </li>
            <li>
              <strong className="text-ink">Shift+Enter</strong> — new line
            </li>
            <li>Attach an image for visual analysis</li>
            <li>
              <strong className="text-ink">Mic</strong> — dictate in any language; speech is transcribed with Gemini 3.5 Transcribe and lands in the message box for review before sending
            </li>
          </ul>
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex min-h-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-borderSoft p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-background">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h1 className="font-heading text-lg font-medium text-ink">EduVerse Assistant</h1>
                <p className="text-xs text-success">{activeProvider} · memory-aware</p>
              </div>
            </div>
            <Badge variant="primary" className="hidden sm:inline-flex">
              {activeProvider}
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} role="log" aria-live="polite" aria-label="Conversation messages" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={message.role === "user" ? "ml-auto max-w-xl space-y-2" : "max-w-xl"}
              >
                {message.role === "user" && message.image && (
                  <div className="flex justify-end">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      decoding="async"
                      src={message.image}
                      alt="Attached image"
                      className="max-h-48 max-w-xs rounded-xl border border-borderSoft object-cover shadow"
                    />
                  </div>
                )}

                <div
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-xl rounded-2xl rounded-tr-sm bg-ink p-4 text-sm leading-6 text-background"
                      : "max-w-xl rounded-2xl rounded-tl-sm border border-borderSoft bg-surface p-4 text-sm leading-6 text-ink"
                  }
                >
                  {message.role === "user" ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <>
                      <FormattedMarkdown content={message.content} />
                      {/* Citations / provenance — grounded in live analytics, never invented */}
                      {message.content && (
                        <div className="mt-3 border-t border-borderSoft pt-2">
                          <button onClick={() => setShowSources((s) => ({ ...s, [index]: !s[index] }))} aria-expanded={Boolean(showSources[index])} className="inline-flex min-h-[32px] touch-manipulation items-center gap-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary transition hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
                            <Cpu aria-hidden="true" className="h-3 w-3" /> {showSources[index] ? "Hide sources" : "Show sources"} · {analytics?.live ? `${analytics.accounts.length} accounts · ${analytics.recentPosts.length} posts` : "no live data — connect Meta"}
                          </button>
                          {showSources[index] && (
                            <div className="mt-2 space-y-1.5 rounded-xl bg-card border border-borderSoft p-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-faintText">Grounded in</p>
                              {analytics?.live ? (
                                <>
                                  {(analytics?.memoryItems ?? []).slice(0, 2).map((m, i) => <p key={i} className="text-xs leading-5 text-mutedText">• {m}</p>)}
                                  {(analytics?.metrics ?? []).slice(0, 2).map((m) => <p key={m.label} className="text-xs text-mutedText">• {m.label}: {m.value}{m.suffix} — {m.detail}</p>)}
                                  {analytics?.recentPosts?.[0] && <p className="text-xs text-mutedText">• Top post: “{(analytics.recentPosts[0].post || "").slice(0, 80)}…”</p>}
                                </>
                              ) : (
                                <p className="text-xs leading-5 text-mutedText">No live Meta data yet. Connect an account to ground answers in Graph API — otherwise the assistant works off general best practices only.</p>
                              )}
                              <p className="text-[10px] text-faintText">Sources are live Meta Graph API only. <button onClick={() => { const q = encodeURIComponent("Explain postingData and engagementData from my analytics in plain English with next steps."); setInput(decodeURIComponent(q)); textareaRef.current?.focus(); }} className="inline-flex min-h-[32px] items-center underline decoration-dotted hover:text-ink">Explain my charts</button> • <button onClick={() => setShowSources((s) => ({ ...s, [index]: false }))} className="inline-flex min-h-[32px] items-center underline decoration-dotted">Close</button></p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-borderSoft p-4">
          {persistenceWarning && (
            <p role="status" className="mb-3 flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              <CloudOff aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Saving is temporarily unavailable — replies still work, but this conversation won&apos;t appear in your history.
            </p>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING_SOFT}
                className="rounded-full border border-borderSoft px-3 py-1.5 text-xs text-mutedText transition-colors duration-150 hover:border-primary hover:text-primary"
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>

          {imagePreview && (
            <div className="mb-2 flex items-start gap-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  width={64}
                  height={64}
                  src={imagePreview}
                  alt="Preview of the image you attached"
                  className="h-16 w-16 rounded-xl border border-borderSoft object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove attached image"
                  className="absolute -right-2 -top-2 grid h-7 w-7 touch-manipulation place-items-center rounded-full bg-ink text-background transition hover:bg-danger focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-mutedText">Image attached — the assistant will analyse it</p>
            </div>
          )}
          {imageError && (
            <p role="alert" className="mb-2 text-xs text-danger">{imageError}</p>
          )}

          {recorder.state === "recording" && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent-soft px-3 py-2" role="status">
              <LevelMeter onLevel={recorder.onLevel} />
              <span className="shrink-0 text-xs font-medium tabular-nums text-mutedText">
                {Math.floor(recorder.seconds / 60)}:{String(recorder.seconds % 60).padStart(2, "0")} · max 1:00
              </span>
              <button
                type="button"
                onClick={recorder.cancel}
                className="min-h-[32px] rounded-full px-2.5 text-xs font-medium text-mutedText transition hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>
          )}
          {(transcribing || voiceError || recorder.state === "denied" || recorder.state === "unsupported" || recorder.state === "error") && (
            <p role={voiceError || recorder.state === "denied" ? "alert" : "status"} className={`mb-2 text-xs ${voiceError || recorder.state === "denied" ? "text-danger" : "text-mutedText"}`}>
              {transcribing
                ? "Transcribing your recording…"
              : recorder.state === "denied"
                ? "Microphone access was blocked. Allow it in your browser settings and try again."
              : recorder.state === "unsupported"
                ? "Voice input needs a browser with microphone recording support."
              : recorder.state === "error"
                ? "Could not start the microphone. Check that no other app is using it."
              : voiceError}
            </p>
          )}

          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
              title="Attach image"
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-borderSoft text-mutedText transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <ImageIcon aria-hidden="true" className="h-4 w-4" />
            </button>

            {recorder.state === "recording" ? (
              <button
                type="button"
                onClick={recorder.stop}
                aria-label="Stop recording and transcribe"
                title="Stop and transcribe"
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-danger text-background transition hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"
              >
                <Square aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void recorder.start()}
                disabled={transcribing}
                aria-label="Record a voice message"
                title="Record a voice message"
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-borderSoft text-mutedText transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transcribing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Mic aria-hidden="true" className="h-4 w-4" />}
              </button>
            )}

            <label className="sr-only" htmlFor="chat-message">
              Ask EduVerse Assistant
            </label>
            <textarea
              ref={textareaRef}
              id="chat-message"
              rows={1}
              className="max-h-40 flex-1 resize-none rounded-2xl border border-borderSoft bg-surface px-4 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faintText focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="Ask about your audience… (Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <Button
              aria-label="Send message"
              disabled={(!input.trim() && !imagePreview) || thinking}
              size="icon"
              type="submit"
              className="h-11 w-11 shrink-0 bg-ink text-background hover:bg-ink/90"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-faintText">
            <Globe aria-hidden="true" className="h-3 w-3" />
            <label className="sr-only" htmlFor="voice-language">Speech language for voice input</label>
            <select
              id="voice-language"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="max-w-[220px] cursor-pointer truncate rounded-md border border-transparent bg-transparent py-0.5 text-[10px] text-mutedText outline-none transition hover:border-borderSoft focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {VOICE_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true">·</span>
            <span>Voice transcription powered by Gemini 3.5 Transcribe</span>
          </div>
          <p className="mt-1 text-center text-[10px] text-faintText">
            Enter to send · Shift+Enter for new line · Image and voice input supported
          </p>
        </div>
      </section>
    </div>
  );
}
