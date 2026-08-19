"use client";

import { useEffect, useState } from "react";
import { Send, Wand2, X, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { MetaAccount } from "@/lib/meta-api";
import { EASE_OUT } from "@/components/motion-variants";

interface MetaPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MetaPublisherModal({ isOpen, onClose, onSuccess }: MetaPublisherModalProps) {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "threads">("instagram");
  const [selectedAccount, setSelectedAccount] = useState<MetaAccount | null>(null);
  const [mediaType, setMediaType] = useState<"CAROUSEL" | "IMAGE" | "VIDEO" | "TEXT">("CAROUSEL");
  const [caption, setCaption] = useState("5 AI automations creators use weekly to save 10 hours 🚀 swipe to see the exact prompts!");
  const [mediaUrls, setMediaUrls] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedResult, setPublishedResult] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<MetaAccount[]>([]);
  const [celebrateKey, setCelebrateKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/meta/connect", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { accounts: [] }))
      .then((data) => {
        const accounts = (data.accounts ?? []) as MetaAccount[];
        setConnectedAccounts(accounts);
        const firstAccount = accounts.find((account) => account.platform === "instagram" || account.platform === "facebook" || account.platform === "threads");
        if (firstAccount) {
          setPlatform(firstAccount.platform);
          setSelectedAccount(firstAccount);
        }
      })
      .catch(() => setConnectedAccounts([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateAICaption = () => {
    setCaption(
      "Stop wasting 10 hours a week on manual posting 💡 Here are 5 AI automations top creators use to repurpose content across Instagram, Facebook, and Threads effortlessly. Save this post for your next content batching day!"
    );
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedAccounts.length) {
      setPublishedResult("Connect a Meta account before publishing.");
      return;
    }
    setPublishing(true);
    setPublishedResult(null);

    const parsedMediaUrls = mediaUrls
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },          body: JSON.stringify({
          platform,
          targetAccountId: selectedAccount?.id ?? connectedAccounts.find((account) => account.platform === platform)?.id,
          mediaType,
          caption,
          mediaUrls: mediaType === "TEXT" ? undefined : parsedMediaUrls,
          // datetime-local is the user's local time; convert to UTC ISO so the
          // server schedules the same instant regardless of its own timezone.
          scheduledTime: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
          hashtags: ["#AI", "#Automation", "#CreatorEconomy", "#EduVerse"]
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPublishedResult(data.status === "SCHEDULED" ? `Post scheduled (${data.postId})` : `Published and confirmed by Meta (${data.postId})`);
        setCelebrateKey((key) => key + 1);
        window.dispatchEvent(new Event("eduverse:analytics-refresh"));
        if (onSuccess) onSuccess();
      } else {
        setPublishedResult(data.error || "Failed to publish.");
      }
    } catch {
      setPublishedResult("Could not reach Meta Graph API.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm transition-opacity">
      <CelebrationBurst trigger={celebrateKey} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-borderSoft bg-card p-6 shadow-glass">
        <div className="flex items-center justify-between border-b border-borderSoft pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-primary">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-medium text-ink">Meta Post Publisher</h3>
              <p className="text-xs text-mutedText">Publish through connected Meta accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-mutedText hover:bg-surface hover:text-ink transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="mt-5 space-y-5">
          {/* Target Channel */}
          <div>
            <label className="block text-xs font-medium text-mutedText mb-2">
              Target Channel {connectedAccounts.length > 1 ? `(${connectedAccounts.length} accounts returned by Meta — select one)` : ""}
            </label>
            {connectedAccounts.length === 0 ? <div className="rounded-xl border border-dashed border-borderSoft bg-surface p-4 text-xs leading-relaxed text-mutedText">No connected Meta channel is available. Connect a Facebook Page with a linked Instagram Business account first.</div> : <div className="grid gap-2 sm:grid-cols-2">
              {connectedAccounts.map((account) => {
                const id = account.platform as "instagram" | "facebook" | "threads";
                const selected = selectedAccount?.id === account.id && selectedAccount?.platform === account.platform;
                return (
                <button
                  key={`${id}-${account.id}`}
                  type="button"
                  onClick={() => {
                    setPlatform(id);
                    setSelectedAccount(account);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-primary bg-accent-soft text-ink"
                      : "border-borderSoft bg-surface text-mutedText hover:bg-surface"
                  }`}
                >
                  <p className="truncate text-xs font-bold">{account.name}</p>
                  <p className="mt-0.5 text-[10px] text-mutedText">{id === "instagram" ? "Instagram Business" : id === "threads" ? "Threads" : "Facebook Page"} · {account.handle}</p>
                </button>
                );
              })}
            </div>}
          </div>

          {/* Media Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-mutedText mb-2">Format</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as typeof mediaType)}
                className="w-full rounded-xl border border-borderSoft bg-surface p-2.5 text-xs text-ink outline-none focus:border-primary"
              >
                <option value="CAROUSEL" className="bg-surface">Carousel</option>
                <option value="IMAGE" className="bg-surface">Single Image</option>
                <option value="VIDEO" className="bg-surface">Reels Short Video</option>
                <option value="TEXT" className="bg-surface">Text Post</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-mutedText mb-2">Scheduled time (optional)</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-xl border border-borderSoft bg-surface p-2 text-xs text-ink outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Media URLs */}
          {mediaType !== "TEXT" && (
            <div>
              <label className="block text-xs font-medium text-mutedText mb-2">
                Media URLs {mediaType === "CAROUSEL" ? "(2+ public HTTPS image links, one per line)" : "(public HTTPS image or video link)"}
              </label>
              <textarea
                rows={2}
                value={mediaUrls}
                onChange={(e) => setMediaUrls(e.target.value)}
                placeholder="https://example.com/media/image-1.jpg&#10;https://example.com/media/image-2.jpg"
                className="w-full rounded-xl border border-borderSoft bg-surface p-3 text-xs text-ink placeholder:text-faintText outline-none focus:border-primary transition"
              />
              <p className="mt-1 text-[10px] text-faintText">Instagram and media posts are rejected without at least one URL. Links must be publicly reachable over HTTPS.</p>
            </div>
          )}

          {/* Caption & AI Hook */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-mutedText">Post Caption & Hook</label>
              <button
                type="button"
                onClick={handleGenerateAICaption}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-strong transition"
              >
                <Wand2 className="h-3 w-3" />
                AI Hook Generator
              </button>
            </div>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-xl border border-borderSoft bg-surface p-3 text-xs text-ink placeholder:text-faintText outline-none focus:border-primary transition"
            />
          </div>

          {/* Hashtags Preview */}
          <div className="flex flex-wrap gap-1.5">
            {["#AI", "#Automation", "#CreatorEconomy", "#EduVerse"].map((tag) => (
              <span key={tag} className="rounded-md border border-borderSoft bg-surface px-2 py-0.5 text-[10px] font-mono text-mutedText">
                {tag}
              </span>
            ))}
          </div>

          {publishedResult && (
            <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{publishedResult}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-borderSoft pt-4">
            <span className="text-[11px] text-mutedText">Publish now or schedule. Media URLs must be public HTTPS links.</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-borderSoft bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing || connectedAccounts.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2 text-xs font-semibold text-background hover:bg-success/90 disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                {publishing ? "Dispatching..." : "Schedule to Meta"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Small confetti pop celebrating a successful publish. Purely decorative, so it
// is aria-hidden and pointer-events-free.
function CelebrationBurst({ trigger }: { trigger: number }) {
  const colors = ["var(--accent-strong)", "var(--accent)", "var(--ok)"];
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <motion.div
          key={trigger}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          {Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            const distance = 110 + (i % 3) * 40;
            const size = 5 + (i % 3) * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{ backgroundColor: colors[i % 3], height: size, width: size }}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [0.6, 1, 0.4],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance - 30
                }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
