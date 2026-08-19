import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Authentication is not configured.", accounts: [] }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required.", accounts: [] }, { status: 401 });
  const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) return NextResponse.json({ success: true, accounts: [] });

  const { data: rows } = await supabase
    .from("social_accounts")
    .select("external_id,display_name,handle,username,avatar_url,platform,status,parent_account_id,token_expires_at,created_at")
    .eq("workspace_id", member.workspace_id)
    .neq("status", "disconnected");

  const now = Date.now();
  const accounts = (rows || []).map((row) => {
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
    let status = row.status as string;
    if (expiresAt !== null) {
      if (expiresAt <= now) status = "expired";
      else if (expiresAt - now < EXPIRING_SOON_MS) status = "token_expiring";
    }
    return {
      id: row.external_id,
      name: row.display_name || row.handle,
      platform: row.platform,
      handle: row.username ? `@${row.username}` : row.handle,
      avatarUrl: row.avatar_url || undefined,
      pageId: row.parent_account_id || undefined,
      connectedAt: row.created_at ?? new Date().toISOString(),
      status
    };
  });
  return NextResponse.json({ success: true, live: true, accounts });
}

const disconnectSchema = z.object({ accountId: z.string().min(1).optional(), platform: z.enum(["instagram", "facebook", "threads"]).optional() });

export async function DELETE(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Authentication is not configured." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, errorCode: "META_AUTH_ERROR", message: "Sign in required." }, { status: 401 });
  const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) return NextResponse.json({ success: false, errorCode: "META_ACCOUNT_ERROR", message: "Workspace unavailable." }, { status: 403 });

  const parsed = disconnectSchema.safeParse(await request.json().catch(() => ({})));
  const filter = parsed.success && parsed.data.accountId
    ? { workspace_id: member.workspace_id, external_id: parsed.data.accountId }
    : parsed.success && parsed.data.platform
      ? { workspace_id: member.workspace_id, platform: parsed.data.platform }
      : { workspace_id: member.workspace_id };

  const { error } = await supabase.from("social_accounts").update({ status: "disconnected", encrypted_token: null }).match(filter);
  if (error) return NextResponse.json({ success: false, errorCode: "META_API_ERROR", message: "Could not disconnect the account." }, { status: 500 });
  return NextResponse.json({ success: true });
}
