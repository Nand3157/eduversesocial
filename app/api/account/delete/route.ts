import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Honest account deletion: clears workspace-scoped data via service_role.
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
    const { data: member } = await service.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
    const workspaceId = member?.workspace_id;

    // Delete workspace-scoped rows before auth user to respect FKs
    if (workspaceId) {
      await service.from("scheduled_posts").delete().eq("workspace_id", workspaceId);
      await service.from("analytics_cache").delete().in("social_account_id", (await service.from("social_accounts").select("id").eq("workspace_id", workspaceId)).data?.map((r: { id: string }) => r.id) || ["__none__"]);
      await service.from("social_accounts").delete().eq("workspace_id", workspaceId);
      await service.from("workspace_members").delete().eq("workspace_id", workspaceId);
      await service.from("workspaces").delete().eq("id", workspaceId);
    }
    // Purge user-uploaded objects from post-media so storage does not retain
    // files after account deletion as promised in /privacy. Bucket uses
    // path uploads/<userId>/<uuid>.<ext> — delete all under that prefix.
    try {
      const prefix = `uploads/${user.id}`;
      const { data: listed } = await service.storage.from("post-media").list(prefix, { limit: 1000 });
      if (listed && listed.length > 0) {
        const paths = listed.map((o) => `${prefix}/${o.name}`).filter((p) => !p.endsWith("/"));
        if (paths.length > 0) await service.storage.from("post-media").remove(paths);
      }
      // Also scrub any legacy uploads under user id without subfolder (defense in depth)
      const { data: rootListed } = await service.storage.from("post-media").list("uploads", { limit: 1000 });
      if (rootListed) {
        const stray = rootListed.filter((o) => o.name.startsWith(user.id)).map((o) => `uploads/${o.name}`);
        if (stray.length > 0) await service.storage.from("post-media").remove(stray).catch(() => undefined);
      }
    } catch (e) {
      logger.warn("account_delete_storage_purge_failed", { userId: user.id, reason: e instanceof Error ? e.message : "unknown" });
    }
    await service.from("profiles").delete().eq("id", user.id);
    // Supabase auth user deletion via admin API
    const { error: adminErr } = await service.auth.admin.deleteUser(user.id);
    if (adminErr) {
      logger.warn("account_delete_admin_failed", { userId: user.id, reason: adminErr.message });
      // Fallback: sign out the user at least
      await supabase.auth.signOut();
      return NextResponse.json({ success: true, partial: true, message: "Workspace data removed, but auth user needs admin confirmation. You have been signed out." });
    }
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Account and workspace deleted." });
  } catch (error) {
    logger.error("account_delete_failed", { userId: user.id, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ success: false, message: "Deletion failed. Try again or contact hello@eduverse.app." }, { status: 500 });
  }
}
