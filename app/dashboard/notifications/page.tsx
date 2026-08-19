"use client";

import { BellRing, CheckCircle2, Link2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItemFast } from "@/components/motion-variants";

const notifications = [
  ["Engagement increased", "Your latest Instagram carousel is outperforming the weekly baseline by 24%.", TrendingUp],
  ["Audience memory updated", "EduVerse strengthened its educational-content preference signal.", CheckCircle2],
  ["Weekly report available", "Your audience and performance report is ready to review.", BellRing],
  ["Platform connected", "LinkedIn account synchronization completed successfully.", Link2]
] as const;

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeading description="Important changes, completed work, and new audience signals." eyebrow="Stay in the loop" title="Notifications" />
      <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
        {notifications.map(([title, body, Icon]) => (
          <motion.div key={title} variants={staggerItemFast} whileHover={{ y: -2 }}>
            <Card className="transition-shadow duration-300 hover:shadow-glass">
              <CardContent className="flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-mutedText">{body}</p>
                  <p className="mt-2 text-xs text-faintText">2 hours ago</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}