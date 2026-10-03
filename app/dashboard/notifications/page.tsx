import { PageHeading } from "@/components/dashboard/page-heading";
import { NotificationList, type NotificationRow } from "@/components/dashboard/notification-list";
import { createClient } from "@/lib/supabase/server";

/**
 * Notifications read real `public.notifications` rows. Analytics writes a
 * workspace-scoped notification when a saved signal changes; this page stays
 * empty until the connected accounts return usable data. Timestamps come from
 * each database row.
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
