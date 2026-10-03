"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItemFast } from "@/components/motion-variants";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

/** Relative timestamp computed from the row — no hardcoded "2 hours ago". */
function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationList({ notifications, error }: { notifications: NotificationRow[]; error: boolean }) {
  const [rows, setRows] = useState(notifications);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function markRead(id: string) {
    if (updating) return;
    setUpdating(id);
    setUpdateError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error("Could not mark this notification as read.");
      setRows((current) => current.map((row) => row.id === id ? { ...row, read_at: new Date().toISOString() } : row));
    } catch (cause) {
      setUpdateError(cause instanceof Error ? cause.message : "Could not update notification.");
    } finally {
      setUpdating(null);
    }
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Notifications couldn&apos;t load just now. They&apos;ll appear here once the connection is restored.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-sm leading-relaxed text-mutedText">
        No notifications yet. When something important changes — engagement shifts, completed work, new audience signals —
        it will appear here.
      </div>
    );
  }
  return (
    <>
    {updateError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{updateError}</p>}
    <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
      {rows.map((notification) => (
        <motion.div key={notification.id} variants={staggerItemFast} whileHover={{ y: -2 }}>
          <Card className="transition-shadow duration-300 hover:shadow-glass">
            <CardContent className="flex gap-4 p-5">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-borderSoft" : "bg-primary"}`} aria-hidden="true" />
              <div>
                <p className="font-medium text-ink">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-mutedText">{notification.body}</p>
                <p className="mt-2 text-xs text-faintText">
                  {timeAgo(notification.created_at)}
                  {!notification.read_at && <span className="sr-only"> — unread</span>}
                </p>
              </div>
              {!notification.read_at && <button type="button" onClick={() => void markRead(notification.id)} disabled={updating !== null} className="ml-auto inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-borderSoft px-3 text-xs font-medium text-mutedText hover:border-primary/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-50"><Check aria-hidden="true" className="h-3.5 w-3.5" />{updating === notification.id ? "Saving…" : "Mark read"}</button>}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
    </>
  );
}
