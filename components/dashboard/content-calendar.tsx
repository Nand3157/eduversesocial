"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, Plus, RefreshCw } from "lucide-react";
import type { MetaAccount } from "@/lib/meta-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, ModalContent, ModalDescription, ModalTitle } from "@/components/ui/modal";
import { useAnalytics } from "@/components/dashboard/analytics-context";

type CalendarPost = { id: string; platform: string; content: string; media: string[]; scheduled_at: string; status: string; approval_status: "pending" | "approved" | "rejected"; account_id?: string; external_post_id?: string; published_at?: string; permalink?: string; source?: "scheduled" | "published" };
type RecurringSlot = { id: string; platform: string; label: string; weekday: number; local_time: string; timezone: string; content_type: string; approval_required: boolean };
type CalendarData = { posts: CalendarPost[]; slots: RecurringSlot[] };
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (value: number) => String(value).padStart(2, "0");
const keyFor = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localInput = (iso: string) => { const d = new Date(iso); return `${keyFor(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const localDateTimeIso = (dateKey: string, time: string) => new Date(`${dateKey}T${time}`).toISOString();
const inputClass = "h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";

export function ContentCalendar() {
  const { data: analytics } = useAnalytics();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [data, setData] = useState<CalendarData>({ posts: [], slots: [] });
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [selected, setSelected] = useState<CalendarPost | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotAccount, setSlotAccount] = useState("");
  const [slotLabel, setSlotLabel] = useState("Weekly content slot");
  const [slotWeekday, setSlotWeekday] = useState(1);
  const [slotTime, setSlotTime] = useState("09:00");
  const [slotContentType, setSlotContentType] = useState("TEXT");
  const [slotTimezone, setSlotTimezone] = useState(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const start = new Date(month.getFullYear(), month.getMonth(), 0);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 2);
    try {
      const [calendarResult, accountResult] = await Promise.allSettled([
        fetch(`/api/meta/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, { cache: "no-store" }),
        fetch("/api/meta/connect", { cache: "no-store" })
      ]);
      const warnings: string[] = [];
      if (calendarResult.status === "fulfilled") {
        const calendarResponse = calendarResult.value;
        const calendarJson = await calendarResponse.json().catch(() => null);
        if (calendarResponse.ok) {
          setData({ posts: Array.isArray(calendarJson?.posts) ? calendarJson.posts : [], slots: Array.isArray(calendarJson?.slots) ? calendarJson.slots : [] });
          warnings.push(...(Array.isArray(calendarJson?.warnings) ? calendarJson.warnings.filter((item: unknown): item is string => typeof item === "string") : []));
        } else {
          warnings.push(calendarJson?.message || "Scheduled calendar items could not load.");
        }
      } else {
        warnings.push("Scheduled calendar items could not load. Check your connection and retry.");
      }
      if (accountResult.status === "fulfilled" && accountResult.value.ok) {
        const accountsJson = await accountResult.value.json().catch(() => null);
        const list = (Array.isArray(accountsJson?.accounts) ? accountsJson.accounts : []) as MetaAccount[];
        setAccounts(list);
        const available = list.filter((account) => account.status === "active" || account.status === "token_expiring");
        setSlotAccount((current) => available.some((account) => account.id === current) ? current : available[0]?.id ?? "");
      } else {
        setAccounts([]);
        setSlotAccount("");
        warnings.push("Connected accounts could not load; recurring slots cannot be added yet.");
      }
      setMessage(warnings.join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load calendar."); }
  }, [month]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const cells = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const total = Math.ceil((firstDay + count) / 7) * 7;
    return Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - firstDay + 1));
  }, [month]);
  const calendarPosts = useMemo(() => {
    const scheduled = data.posts.map((post) => ({
      ...post,
      source: post.status === "PUBLISHED" ? "published" as const : "scheduled" as const,
      scheduled_at: post.status === "PUBLISHED" && post.published_at ? post.published_at : post.scheduled_at
    }));
    const alreadyScheduled = new Set(data.posts.map((post) => post.external_post_id).filter(Boolean));
    const published = (analytics?.recentPosts ?? [])
      .filter((post) => post.timestamp && (!post.id || !alreadyScheduled.has(post.id)))
      .map((post, index): CalendarPost => ({
        id: `meta:${post.platform}:${post.id ?? `${post.timestamp}:${index}`}`,
        external_post_id: post.id,
        platform: post.platform,
        content: post.post,
        media: [],
        scheduled_at: post.timestamp!,
        status: "PUBLISHED",
        approval_status: "approved",
        account_id: post.accountId,
        permalink: post.permalink,
        source: "published"
      }));
    return [...scheduled, ...published];
  }, [analytics?.recentPosts, data.posts]);
  const postsByDay = useMemo(() => {
    const groups = new Map<string, CalendarPost[]>();
    calendarPosts.forEach((post) => { const key = keyFor(new Date(post.scheduled_at)); groups.set(key, [...(groups.get(key) ?? []), post]); });
    return groups;
  }, [calendarPosts]);

  const updatePost = async (id: string, change: { scheduledAt?: string; approvalStatus?: "pending" | "approved" | "rejected" }) => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/meta/calendar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...change }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update post.");
      await load(); setSelected((current) => current?.id === id ? { ...current, ...(change.scheduledAt ? { scheduled_at: change.scheduledAt } : {}), ...(change.approvalStatus ? { approval_status: change.approvalStatus } : {}) } : current);
      setMessage("Calendar updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update post."); }
    finally { setBusy(false); }
  };

  const createSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    const account = accounts.find((item) => item.id === slotAccount);
    if (!account) { setMessage("Connect an account before adding a recurring slot."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/meta/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: account.id, platform: account.platform, label: slotLabel, weekday: slotWeekday, localTime: slotTime, timezone: slotTimezone, contentType: slotContentType, approvalRequired: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save slot.");
      setCreatingSlot(false); await load(); setMessage("Recurring slot saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save slot."); }
    finally { setBusy(false); }
  };

  const disableSlot = async (id: string) => {
    setBusy(true);
    try { const response = await fetch("/api/meta/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove slot."); }
    finally { setBusy(false); }
  };

  return <>
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Visual content calendar</CardTitle><CardDescription className="mt-1">Drag a scheduled post to move it. Select it to preview, edit, or approve.</CardDescription></div><div className="flex items-center gap-2"><Button size="icon" variant="secondary" aria-label="Previous month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-32 text-center text-sm font-semibold text-ink">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span><Button size="icon" variant="secondary" aria-label="Next month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => void load()} aria-label="Refresh calendar"><RefreshCw className="h-3.5 w-3.5" /></Button></div></div></CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-mutedText">Drag and drop works with a mouse; select a post to reschedule with the form.</p><Button size="sm" variant="secondary" onClick={() => setCreatingSlot(true)}><Plus className="h-3.5 w-3.5" />Recurring slot</Button></div>
        <div className="grid grid-cols-7 border-l border-t border-borderSoft">{weekdays.map((day) => <div key={day} className="border-b border-r border-borderSoft bg-surface px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-faintText">{day}</div>)}
          {cells.map((date) => {
            const key = keyFor(date); const inMonth = date.getMonth() === month.getMonth(); const posts = postsByDay.get(key) ?? [];
            const slots = data.slots.filter((slot) => {
              try {
                const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
                const weekday = new Intl.DateTimeFormat("en-US", { timeZone: slot.timezone, weekday: "short" }).format(localNoon);
                return weekdays.indexOf(weekday) === slot.weekday;
              } catch { return false; }
            });
            return <div key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain"); const post = data.posts.find((item) => item.id === id); if (post) { const original = new Date(post.scheduled_at); const next = localDateTimeIso(key, `${pad(original.getHours())}:${pad(original.getMinutes())}`); if (Date.parse(next) > Date.now()) void updatePost(post.id, { scheduledAt: next }); else setMessage("Choose a future date to reschedule."); } }} className={`min-h-28 border-b border-r border-borderSoft p-1.5 ${inMonth ? "bg-card" : "bg-surface/50"}`}><div className={`mb-1 text-right text-[10px] tabular-nums ${inMonth ? "text-mutedText" : "text-faintText"}`}>{date.getDate()}</div><div className="space-y-1">
              {posts.map((post) => <button draggable={post.source !== "published"} onDragStart={(event) => { if (post.source === "published") return; event.dataTransfer.setData("text/plain", post.id); }} onClick={() => { setSelected(post); setScheduleValue(localInput(post.scheduled_at)); }} key={post.id} className="group flex w-full touch-manipulation items-start gap-1 rounded-lg border border-borderSoft bg-surface px-1.5 py-1 text-left text-[10px] leading-4 text-ink hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><GripVertical aria-hidden="true" className={`mt-0.5 h-3 w-3 shrink-0 text-faintText ${post.source === "published" ? "opacity-20" : "opacity-60"}`} /><span className="min-w-0 flex-1"><span className="font-semibold capitalize">{post.platform}</span><span className="ml-1 text-mutedText">{new Date(post.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><span className="block truncate">{post.content}</span><span className={`mt-0.5 inline-block rounded px-1 py-0.5 ${post.source === "published" || post.approval_status === "approved" ? "bg-success/10 text-success" : post.approval_status === "pending" ? "bg-[var(--warn-soft)] text-warning-ink" : "bg-danger/10 text-danger"}`}>{post.source === "published" ? "Published" : post.approval_status}</span></span></button>)}
              {slots.map((slot) => <div key={slot.id} className="truncate rounded-md border border-dashed border-primary/30 bg-accent-soft/50 px-1.5 py-1 text-[9px] leading-4 text-primary" title={`${slot.label} · ${slot.timezone}`}>↻ {slot.local_time.slice(0, 5)} {slot.label}</div>)}
            </div></div>;
          })}
        </div>
        {message && <p role="status" className="mt-3 text-xs text-mutedText">{message}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{data.slots.map((slot) => <div key={slot.id} className="flex items-center gap-2 rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-[10px] text-mutedText"><Clock3 className="h-3 w-3 text-primary" />Every {weekdays[slot.weekday]} · {slot.local_time.slice(0, 5)} {slot.timezone} · {slot.platform}<button disabled={busy} onClick={() => void disableSlot(slot.id)} className="ml-1 text-danger hover:underline">Remove</button></div>)}</div>
      </CardContent>
    </Card>

    <Modal open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><ModalContent><ModalTitle>{selected?.source === "published" ? "Published post" : "Scheduled post"}</ModalTitle><ModalDescription>{selected?.source === "published" ? "This post was published on Meta and is shown here as read-only history." : "Review exactly what is scheduled, then adjust the time or approval."}</ModalDescription>{selected && <div className="mt-4 space-y-4"><div className="overflow-hidden rounded-xl border border-borderSoft bg-surface"><div className="flex items-center justify-between gap-2 border-b border-borderSoft px-4 py-3"><Badge variant="primary" className="capitalize">{selected.platform}</Badge><Badge variant={selected.source === "published" || selected.approval_status === "approved" ? "success" : selected.approval_status === "pending" ? "warning" : "danger"}>{selected.source === "published" ? "Published" : selected.approval_status}</Badge></div>{selected.media?.[0] && <div className="relative max-h-64 overflow-hidden bg-borderSoft"><Image unoptimized src={selected.media[0]} alt={`Scheduled ${selected.platform} post media preview`} width={800} height={480} className="mx-auto max-h-64 w-full object-contain" /></div>}<div className="p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-ink">{selected.content}</p>{selected.media?.length > 1 && <p className="mt-3 text-xs text-mutedText">+ {selected.media.length - 1} more media item{selected.media.length === 2 ? "" : "s"}</p>}</div><div className="border-t border-borderSoft px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-faintText">{selected.platform} · {new Date(selected.scheduled_at).toLocaleString()}</div></div>{selected.source === "published" ? (selected.permalink && <a className="block text-center text-sm font-medium text-primary underline underline-offset-4" href={selected.permalink} target="_blank" rel="noreferrer">Open published post</a>) : <><label className="block text-xs font-medium text-mutedText">Scheduled time<input type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} className={`${inputClass} mt-1`} /></label><Button className="w-full" disabled={busy || !scheduleValue} onClick={() => void updatePost(selected.id, { scheduledAt: new Date(scheduleValue).toISOString() })}>Save time</Button><div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={busy} onClick={() => void updatePost(selected.id, { approvalStatus: "approved" })}>Approve</Button><Button variant="ghost" disabled={busy} onClick={() => void updatePost(selected.id, { approvalStatus: selected.approval_status === "rejected" ? "pending" : "rejected" })}>{selected.approval_status === "rejected" ? "Send to review" : "Reject"}</Button></div></>}</div>}</ModalContent></Modal>

    <Modal open={creatingSlot} onOpenChange={setCreatingSlot}><ModalContent><ModalTitle>Recurring content slot</ModalTitle><ModalDescription>Add a reusable weekly publishing window. This reserves a slot; it does not auto-create or publish posts.</ModalDescription><form onSubmit={createSlot} className="mt-4 space-y-3"><label className="block text-xs font-medium text-mutedText">Connected account<select required aria-label="Connected account" value={slotAccount} onChange={(event) => setSlotAccount(event.target.value)} className={`${inputClass} mt-1`}><option value="" disabled>{accounts.some((account) => account.status === "active" || account.status === "token_expiring") ? "Choose a connected account" : "No active Meta accounts available"}</option>{accounts.filter((account) => account.status === "active" || account.status === "token_expiring").map((account) => <option key={account.id} value={account.id}>{account.name} · {account.platform}</option>)}</select></label><label className="block text-xs font-medium text-mutedText">Slot name<input value={slotLabel} onChange={(event) => setSlotLabel(event.target.value)} maxLength={100} className={`${inputClass} mt-1`} required /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-mutedText">Day<select value={slotWeekday} onChange={(event) => setSlotWeekday(Number(event.target.value))} className={`${inputClass} mt-1`}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="text-xs font-medium text-mutedText">Local time<input type="time" value={slotTime} onChange={(event) => setSlotTime(event.target.value)} className={`${inputClass} mt-1`} required /></label></div><label className="block text-xs font-medium text-mutedText">Default format<select value={slotContentType} onChange={(event) => setSlotContentType(event.target.value)} className={`${inputClass} mt-1`}><option value="TEXT">Text</option><option value="IMAGE">Image</option><option value="VIDEO">Video / Reel</option><option value="CAROUSEL">Carousel</option></select></label><label className="block text-xs font-medium text-mutedText">Timezone<input value={slotTimezone} onChange={(event) => setSlotTimezone(event.target.value)} maxLength={80} className={`${inputClass} mt-1`} required /></label><label className="flex items-center gap-2 text-xs text-mutedText"><input type="checkbox" checked readOnly className="accent-primary" />Require approval for scheduled posts in this slot</label><Button type="submit" disabled={busy || !accounts.some((account) => account.status === "active" || account.status === "token_expiring")} className="w-full">Save recurring slot</Button></form></ModalContent></Modal>
  </>;
}
