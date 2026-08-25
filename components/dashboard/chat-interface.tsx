"use client";

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, ImageIcon, Send, Sparkles, Cpu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SPRING_SOFT } from "@/components/motion-variants";
import { useAnalytics } from "@/components/dashboard/analytics-context";

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
        <h4 key={i} className="mb-1 mt-3 text-xs font-bold text-primary">
          {formatInline(trimmed.slice(5))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mb-1.5 mt-3.5 text-xs font-bold uppercase tracking-wider text-primary">
          {formatInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mb-1 mt-4 text-sm font-bold text-ink">
          {formatInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="my-2 rounded-r-lg border-l-2 border-primary bg-accent-soft p-2.5 text-xs leading-relaxed text-ink"
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

export function ChatInterface() {
  const reduceMotion = useReducedMotion();
  const { data: analytics } = useAnalytics();
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>("Gemini 3.5 Flash");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [showSources, setShowSources] = useState<Record<number, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Set when the user opens a different conversation while a response is still
  // streaming, so the stream can never clobber the newly opened messages.
  const switchedAwayRef = useRef(false);
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
    switchedAwayRef.current = true;
    try {
      const response = await fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.messages) {
        setConversationId(id);
        setMessages(data.messages as Message[]);
        setInput("");
        setImagePreview(null);
      }
    } catch {
      // Keep the current conversation on failure.
    } finally {
      setLoadingConversation(false);
    }
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
  useEffect(() => {
    const isNewMessage = messages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    // Smooth-scroll only when a message is added; use the cheap auto scroll for
    // the frequent content updates during streaming.
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : isNewMessage ? "smooth" : "auto" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeImage() {
    setImagePreview(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: nextMessages })
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to generate a response.");
      }

      const providerHeader = response.headers.get("X-AI-Provider");
      const modelHeader = response.headers.get("X-AI-Model");
      if (providerHeader === "gemini" || modelHeader) setActiveProvider("Gemini 3.5 Flash");

      setConversationId(response.headers.get("X-Conversation-ID") ?? conversationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      answerRef.current = "";
      const renderStream = () => {
        // If the user opened a different conversation while streaming, drop the
        // render into the old one (the server still persists the answer to the
        // original conversation).
        if (switchedAwayRef.current) return;
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

      if (!answerRef.current) throw new Error("The AI provider returned an empty response.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate a response.";
      if (!switchedAwayRef.current) {
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
    <div className="grid min-h-[calc(100vh-150px)] overflow-hidden rounded-2xl border border-borderSoft bg-card shadow-glass lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-borderSoft bg-surface p-4 lg:block">
        <Button
          className="w-full bg-ink text-background hover:bg-ink/90"
          onClick={() => {
            setConversationId(undefined);
            setMessages([welcome]);
            setInput("");
            setImagePreview(null);
          }}
          size="sm"
        >
          <Sparkles className="h-4 w-4" />
          New conversation
        </Button>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wider text-mutedText">
          Saved conversations
        </p>
        {loadingConversation ? (
          <p className="mt-2 text-xs leading-5 text-mutedText">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-mutedText">
            Your latest conversation is restored automatically.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {conversations.map((conversation) => {
              const active = conversation.id === conversationId;
              return (
                <li key={conversation.id}>
                  <button
                    onClick={() => openConversation(conversation.id)}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition ${
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
        )}

        <div className="mt-6 rounded-xl border border-primary/25 bg-accent-soft p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Cpu className="h-3.5 w-3.5" />
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
          </ul>
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex min-h-[600px] flex-col">
        {/* Header */}
        <div className="border-b border-borderSoft p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-background">
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
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
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
                      : "max-w-xl rounded-2xl rounded-tl-sm bg-surface p-4 text-sm leading-6"
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
                          <button onClick={() => setShowSources((s) => ({ ...s, [index]: !s[index] }))} className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary-strong flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> {showSources[index] ? "Hide sources" : "Show sources"} · {analytics?.live ? `${analytics.accounts.length} accounts · ${analytics.recentPosts.length} posts` : "no live data — connect Meta"}
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
                              <p className="text-[10px] text-faintText">Sources are live Meta Graph API only. <button onClick={() => { const q = encodeURIComponent("Explain postingData and engagementData from my analytics in plain English with next steps."); setInput(decodeURIComponent(q)); textareaRef.current?.focus(); }} className="underline decoration-dotted hover:text-ink">Explain my charts</button> • <button onClick={() => setShowSources((s) => ({ ...s, [index]: false }))} className="underline decoration-dotted">Close</button></p>
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
        <div className="border-t border-borderSoft p-4">
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
                  src={imagePreview}
                  alt="Preview"
                  className="h-16 w-16 rounded-xl border border-borderSoft object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove attached image"
                  className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-background transition hover:bg-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1 text-xs text-mutedText">Image attached — Gemini will analyse it</p>
            </div>
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-borderSoft text-mutedText transition hover:border-primary hover:text-primary"
            >
              <ImageIcon className="h-4 w-4" />
            </button>

            <label className="sr-only" htmlFor="chat-message">
              Ask EduVerse Assistant
            </label>
            <textarea
              ref={textareaRef}
              id="chat-message"
              rows={1}
              className="max-h-40 flex-1 resize-none rounded-2xl border border-borderSoft bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-faintText focus:border-primary"
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
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-2 text-center text-[10px] text-faintText">
            Enter to send · Shift+Enter for new line · Images supported via Gemini
          </p>
        </div>
      </section>
    </div>
  );
}
