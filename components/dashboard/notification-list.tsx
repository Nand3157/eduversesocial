"use client";

import { motion } from "framer-motion";
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
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Notifications couldn&apos;t load just now. They&apos;ll appear here once the connection is restored.
      </div>
    );
  }
  if (notifications.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-dashed border-borderSoft bg-surface/50 p-8 text-center text-sm leading-relaxed text-mutedText">
        No notifications yet. When something important changes — engagement shifts, completed work, new audience signals —
        it will appear here.
      </div>
    );
  }
  return (
    <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
      {notifications.map((notification) => (
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
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
