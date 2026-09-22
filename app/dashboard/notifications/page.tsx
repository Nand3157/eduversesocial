import { PageHeading } from "@/components/dashboard/page-heading";
import { NotificationList, type NotificationRow } from "@/components/dashboard/notification-list";
import { createClient } from "@/lib/supabase/server";

/**
 * Notifications — reads the real `public.notifications` table (RLS-isolated
 * per workspace). No producers write rows yet, so the honest empty state is
 * the normal first-run experience; this page previously rendered a hardcoded
 * fake item list instead of touching the table. Server-rendered like the
 * rest of the dashboard. Row timestamps are computed per row in
 * notification-list.tsx, never hardcoded.
 */
export default async function NotificationsPage() {
  let notifications: NotificationRow[] = [];
  let error = false;
  try {
    const supabase = await createClient();
    if (!supabase) {
      error = true;
    } else {
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id,type,title,body,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (queryError) {
        error = true;
      } else {
        notifications = (data ?? []) as NotificationRow[];
      }
    }
  } catch {
    error = true;
  }

  return (
    <div className="space-y-6">
      <PageHeading description="Important changes, completed work, and new audience signals." eyebrow="Stay in the loop" title="Notifications" />
      <NotificationList notifications={notifications} error={error} />
    </div>
  );
}
