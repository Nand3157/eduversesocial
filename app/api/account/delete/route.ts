import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Deletes the authenticated account and its own media through service_role.
 * If service_role is not configured, returns 404 so the client falls back
 * to local-only clear + sign-out with contact instructions — never pretends
 * the server row was deleted when it wasn't.
 */
export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, message: "Auth not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });

  const rate = await checkRateLimit(`delete:${user.id}`, 3, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many deletion attempts. Try again later." }, { status: 429 });

  const service = createServiceClient();
  if (!service) {
    // Service role missing — caller should clear local storage and show GDPR contact
    return NextResponse.json({ success: false, message: "Server deletion not configured — local data cleared. Contact hello@eduverse.app for permanent erasure." }, { status: 404 });
  }

  try {
    // Purge user-uploaded objects from post-media so storage does not retain
    // files after account deletion as promised in /privacy. Bucket uses
    // path uploads/<userId>/<uuid>.<ext> — delete all under that prefix.
    const prefix = `uploads/${user.id}`;
    const { data: listed, error: listError } = await service.storage.from("post-media").list(prefix, { limit: 1000 });
    if (listError) throw new Error(`Storage listing failed: ${listError.message}`);
    if (listed && listed.length > 0) {
      const paths = listed.map((o) => `${prefix}/${o.name}`).filter((path) => !path.endsWith("/"));
      if (paths.length > 0) {
        const { error: removeError } = await service.storage.from("post-media").remove(paths);
        if (removeError) throw new Error(`Storage cleanup failed: ${removeError.message}`);
      }
    }

    // Auth deletion and the verified ON DELETE cascades handle this user's
    // rows transactionally. Shared workspaces survive unless the user owns
    // them; deleting a membership never grants workspace-delete permission.
    const { error: adminErr } = await service.auth.admin.deleteUser(user.id);
    if (adminErr) {
      logger.warn("account_delete_admin_failed", { userId: user.id, reason: adminErr.message });
      return NextResponse.json({ success: false, message: "The account could not be deleted. Please try again or contact support." }, { status: 503 });
    }
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Account deleted." });
  } catch (error) {
    logger.error("account_delete_failed", { userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ success: false, message: "Deletion failed. Try again or contact hello@eduverse.app." }, { status: 500 });
  }
}
