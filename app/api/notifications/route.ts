import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid notification." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Notifications are unavailable." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) return Response.json({ error: "Could not load workspace." }, { status: 500 });
  if (!membership) return Response.json({ error: "Workspace not found." }, { status: 403 });

  const { data: updated, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("workspace_id", membership.workspace_id)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "Could not update notification." }, { status: 500 });
  if (!updated) return Response.json({ error: "Notification not found." }, { status: 404 });
  return Response.json({ success: true });
}
