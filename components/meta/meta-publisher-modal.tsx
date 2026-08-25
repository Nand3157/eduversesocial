"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Wand2, X, CheckCircle2, AlertCircle, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import type { MetaAccount } from "@/lib/meta-api";
import { EASE_OUT } from "@/components/motion-variants";

interface MetaPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCaption?: string;
  initialPlatform?: "instagram" | "facebook" | "threads";
}

type UploadedMedia = { url: string; preview: string };

const MAX_UPLOAD_MB = 4;
const MAX_UPLOADS = 4;
const DEFAULT_HASHTAGS = ["#AI", "#Automation", "#CreatorEconomy", "#EduVerse"];

const FIELD_CLASS =
  "w-full rounded-xl border border-borderSoft bg-surface p-2.5 text-xs text-ink placeholder:text-faintText transition-[border-color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";

const isErrorResult = (message: string) =>
  /^(failed|could not|connect|no connected)/i.test(message);

export function MetaPublisherModal({ isOpen, onClose, onSuccess, initialCaption, initialPlatform }: MetaPublisherModalProps) {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "threads">("instagram");
  const [selectedAccount, setSelectedAccount] = useState<MetaAccount | null>(null);
  const [mediaType, setMediaType] = useState<"CAROUSEL" | "IMAGE" | "VIDEO" | "TEXT">("CAROUSEL");
  const [caption, setCaption] = useState("5 AI automations creators use weekly to save 10 hours 🚀 swipe to see the exact prompts!");
  const [mediaUrls, setMediaUrls] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [generatingHook, setGeneratingHook] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);
  const [hookSuggestions, setHookSuggestions] = useState<string[]>([]);
  const [publishedResult, setPublishedResult] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<MetaAccount[]>([]);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [hashtags, setHashtags] = useState<string[]>(DEFAULT_HASHTAGS);
  const [hashtagInput, setHashtagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    if (initialCaption) setCaption(initialCaption);
    if (initialPlatform) setPlatform(initialPlatform);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

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

  const typedUrls = () => mediaUrls.split(/[\n,]/).map((url) => url.trim()).filter(Boolean);
  const allMediaUrls = () => [...uploadedMedia.map((media) => media.url), ...typedUrls()];

  const handleUpload = async (file: File) => {
    if (uploading) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setHookError(`Image must be under ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    if (uploadedMedia.length >= MAX_UPLOADS) {
      setHookError(`Up to ${MAX_UPLOADS} images can be uploaded.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploading(true);
      setHookError(null);
      try {
        const res = await fetch("/api/meta/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setUploadedMedia((current) => [...current, { url: data.url, preview: dataUrl }]);
        } else {
          setHookError(data.message || "Could not upload the image.");
        }
      } catch {
        setHookError("Could not reach the upload service. Check your connection and retry.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAICaption = async () => {
    setGeneratingHook(true);
    setHookError(null);
    setHookSuggestions([]);
    try {
      const res = await fetch("/api/meta/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          mediaType,
          caption,
          mediaUrls: allMediaUrls(),
          images: uploadedMedia.slice(0, MAX_UPLOADS).map((media) => media.preview),
          accountName: selectedAccount?.name,
          accountHandle: selectedAccount?.handle,
          variations: 3
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.captions) && data.captions.length) {
          setHookSuggestions(data.captions as string[]);
          setCaption(data.captions[0] as string);
        } else if (data.caption) {
          setCaption(data.caption);
          setHookSuggestions([data.caption]);
        } else {
          setHookError("No hook returned. Try adding more detail to your caption, then generate again.");
        }
      } else {
        setHookError(data.message || "Could not generate a hook. Try again in a moment.");
      }
    } catch {
      setHookError("Could not reach the hook generator. Check your network and try again.");
    } finally {
      setGeneratingHook(false);
    }
  };

  const addHashtag = () => {
    let tag = hashtagInput.trim();
    if (!tag) return;
    if (!tag.startsWith("#")) tag = `#${tag}`;
    tag = tag.replace(/\s+/g, "");
    if (tag.length < 2 || tag.length > 30) { setHookError("Hashtag must be 2–30 characters."); return; }
    if (hashtags.includes(tag)) { setHashtagInput(""); return; }
    if (hashtags.length >= 8) { setHookError("Up to 8 hashtags. Remove one to add another."); return; }
    setHashtags((h) => [...h, tag]);
    setHashtagInput("");
    setHookError(null);
  };
  const removeHashtag = (tag: string) => setHashtags((h) => h.filter((t) => t !== tag));

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedAccounts.length) {
      setPublishedResult("Connect a Meta account before publishing.");
      return;
    }
    setPublishing(true);
    setPublishedResult(null);

    const parsedMediaUrls = allMediaUrls();

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
          hashtags
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPublishedResult(data.status === "SCHEDULED" ? `Post scheduled (${data.postId})` : `Published and confirmed by Meta (${data.postId})`);
        setCelebrateKey((key) => key + 1);
        window.dispatchEvent(new Event("eduverse:analytics-refresh"));
        if (onSuccess) onSuccess();
      } else {
        setPublishedResult(data.message || data.error || "Failed to publish. Check the post details and try again.");
      }
    } catch {
      setPublishedResult("Could not reach Meta Graph API. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-borderSoft bg-card p-6 shadow-glass">
          <CelebrationBurst trigger={celebrateKey} />
          <div className="flex items-center justify-between border-b border-borderSoft pb-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-primary">
                <Send className="h-5 w-5" />
              </span>
              <div>
                <Dialog.Title className="font-heading text-lg font-medium text-ink">Meta Post Publisher</Dialog.Title>
                <Dialog.Description className="text-xs text-mutedText">Publish through connected Meta accounts</Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close publisher dialog" className="rounded-lg p-2 text-mutedText hover:bg-surface hover:text-ink transition">
              <X aria-hidden="true" className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handlePublish} className="mt-5 space-y-5">
            {/* Target Channel */}
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-mutedText">
                Target Channel {connectedAccounts.length > 1 ? `(${connectedAccounts.length} accounts returned by Meta — select one)` : ""}
              </legend>
              {connectedAccounts.length === 0 ? <div className="rounded-xl border border-dashed border-borderSoft bg-surface p-4 text-xs leading-relaxed text-mutedText">No connected Meta channel is available. Connect a Facebook Page with a linked Instagram Business account first.</div> : <div className="grid gap-2 sm:grid-cols-2">
                {connectedAccounts.map((account) => {
                  const id = account.platform as "instagram" | "facebook" | "threads";
                  const selected = selectedAccount?.id === account.id && selectedAccount?.platform === account.platform;
                  return (
                  <button
                    key={`${id}-${account.id}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setPlatform(id);
                      setSelectedAccount(account);
                    }}
                    className={`touch-manipulation rounded-xl border p-3 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 ${
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
            </fieldset>

            {/* Media Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="publisher-format" className="mb-2 block text-xs font-medium text-mutedText">Format</label>
                <select
                  id="publisher-format"
                  name="format"
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as typeof mediaType)}
                  className={`${FIELD_CLASS} p-2.5`}
                >
                  <option value="CAROUSEL">Carousel</option>
                  <option value="IMAGE">Single Image</option>
                  <option value="VIDEO">Reels Short Video</option>
                  <option value="TEXT">Text Post</option>
                </select>
              </div>
              <div>
                <label htmlFor="publisher-schedule" className="mb-2 block text-xs font-medium text-mutedText">Scheduled time (optional)</label>
                <input
                  id="publisher-schedule"
                  name="scheduledTime"
                  type="datetime-local"
                  autoComplete="off"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className={`${FIELD_CLASS} p-2`}
                />
              </div>
            </div>

            {/* Media */}
            {mediaType !== "TEXT" && (
              <div>
                <label htmlFor="publisher-media-urls" className="mb-2 block text-xs font-medium text-mutedText">
                  Media — upload images or paste public HTTPS links
                </label>

                {/* Uploaded image previews */}
                {uploadedMedia.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {uploadedMedia.map((media, index) => (
                      <div key={media.url} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-borderSoft bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL preview, not an optimized remote asset */}
                        <img src={media.preview} alt={`Uploaded media ${index + 1}`} width={64} height={64} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove uploaded image ${index + 1}`}
                          onClick={() => setUploadedMedia((current) => current.filter((_, i) => i !== index))}
                          className="absolute right-0.5 top-0.5 grid h-7 w-7 place-items-center rounded-full bg-background/80 text-danger opacity-100 transition hover:bg-background md:h-5 md:w-5 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 aria-hidden="true" className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload control */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || uploadedMedia.length >= MAX_UPLOADS}
                    className="inline-flex touch-manipulation items-center gap-1.5 rounded-xl border border-dashed border-borderSoft bg-surface px-3 py-2 text-xs font-semibold text-primary transition-[border-color] hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {uploading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading…" : `Upload image (${uploadedMedia.length}/${MAX_UPLOADS})`}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* URL input */}
                <textarea
                  id="publisher-media-urls"
                  name="mediaUrls"
                  rows={2}
                  value={mediaUrls}
                  onChange={(e) => setMediaUrls(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={"Or paste links — one per line…\nhttps://example.com/media/image-1.jpg"}
                  className={`${FIELD_CLASS} mt-2 p-3`}
                />
                <p className="mt-1 text-[10px] text-faintText">Uploaded images are stored securely and become public HTTPS links. Instagram rejects media posts without at least one media item.</p>
              </div>
            )}

            {/* Caption & AI Hook */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="publisher-caption" className="text-xs font-medium text-mutedText">Post Caption & Hook</label>
                <button
                  type="button"
                  onClick={handleGenerateAICaption}
                  disabled={generatingHook}
                  className="inline-flex touch-manipulation items-center gap-1 py-1 text-[11px] font-semibold text-primary transition hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  {generatingHook ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : <Wand2 aria-hidden="true" className="h-3 w-3" />}
                  {generatingHook ? "Generating…" : "AI Hook Generator (3 variations)"}
                </button>
              </div>
              <textarea
                id="publisher-caption"
                name="caption"
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
                className={`${FIELD_CLASS} p-3`}
                placeholder="Write your caption — AI will create 3 hook variations from it…"
              />
              <div className="mt-1 flex justify-between text-[10px] text-faintText">
                <span>The hook generator reads your images and links to craft single-sentence hooks.</span>
                <span className={caption.length > 2000 ? "text-warning" : ""}>{caption.length}/2200</span>
              </div>
              {hookSuggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI suggestions — click to use:</p>
                  {hookSuggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => setCaption(s)} className="w-full touch-manipulation rounded-xl border border-primary/20 bg-accent-soft px-3 py-2 text-left text-xs leading-relaxed text-ink transition-[border-color,background-color] hover:border-primary hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
                      <span aria-hidden="true" className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-background">{i+1}</span>{s}
                    </button>
                  ))}
                </div>
              )}
              {hookError && <p role="alert" className="mt-1 text-[11px] text-danger">{hookError}</p>}
            </div>

            {/* Hashtags - editable */}
            <div>
              <label htmlFor="publisher-hashtag" className="mb-2 block text-xs font-medium text-mutedText">Hashtags — editable ({hashtags.length}/8)</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-borderSoft bg-surface px-2 py-0.5 text-[10px] font-mono text-mutedText">
                    {tag}
                    <button type="button" onClick={() => removeHashtag(tag)} aria-label={`Remove ${tag}`} className="ml-0.5 rounded-full p-0.5 hover:bg-borderSoft hover:text-ink"><X aria-hidden="true" className="h-3 w-3" /></button>
                  </span>
                ))}
                {hashtags.length === 0 && <span className="text-[10px] text-faintText italic">No hashtags — add one below</span>}
              </div>
              <div className="flex gap-2">
                <input id="publisher-hashtag" name="hashtag" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addHashtag(); }}} spellCheck={false} autoCapitalize="off" autoComplete="off" placeholder="Add #hashtag and press Enter…" className={`${FIELD_CLASS} h-8 flex-1 px-3`} maxLength={30} />
                <button type="button" onClick={addHashtag} className="touch-manipulation rounded-xl border border-borderSoft bg-surface px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">Add</button>
                {hashtags.length > 0 && <button type="button" onClick={() => setHashtags([])} className="touch-manipulation rounded-xl px-2 py-1.5 text-xs text-mutedText transition hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:outline-none">Clear</button>}
              </div>
            </div>

            <div aria-live="polite">
              {publishedResult && (
                isErrorResult(publishedResult) ? (
                  <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 p-3 text-xs text-danger">
                    <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{publishedResult}</span>
                  </div>
                ) : (
                  <div role="status" className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-xs text-success">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{publishedResult}</span>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t border-borderSoft pt-4">
              <span className="text-[11px] text-mutedText">Publish now or schedule. Media must be public HTTPS links or uploaded images.</span>
              <div className="flex gap-2">
                <Dialog.Close className="touch-manipulation rounded-xl border border-borderSoft bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface">Cancel</Dialog.Close>
                <button
                  type="submit"
                  disabled={publishing || connectedAccounts.length === 0}
                  className="inline-flex touch-manipulation items-center gap-2 rounded-xl bg-success px-5 py-2 text-xs font-semibold text-background transition-[background-color] hover:bg-success/90 focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <Send aria-hidden="true" className="h-3.5 w-3.5" />
                  {publishing ? "Dispatching…" : "Schedule to Meta"}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Small confetti pop celebrating a successful publish. Purely decorative, so it
// is aria-hidden and pointer-events-free. MotionConfig reducedMotion="user" in
// the root layout disables it for reduced-motion users.
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
