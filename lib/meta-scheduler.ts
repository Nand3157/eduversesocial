import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { publishToPlatform } from "@/lib/social-publisher";
import { MetaError } from "@/lib/meta-errors";
import { mapLimit } from "@/lib/async";
import type { MetaPostPayload } from "@/lib/meta-api";

/** Bounded parallelism so a burst of due posts does not overwhelm Meta's rate limits. */
const PUBLISH_CONCURRENCY = 3;

const MAX_ATTEMPTS = 4;
const BACKOFF_BASE_MS = 60_000;
/** A claim older than this is considered abandoned by a crashed or stopped worker. */
const STALE_PUBLISHING_MS = 10 * 60_000;

/** Exponential backoff with jitter to avoid thundering-herd retries. */
function backoffDelayMs(attempt: number) {
  const base = BACKOFF_BASE_MS * Math.pow(2, Math.min(attempt, 5));
  return base * (0.8 + Math.random() * 0.4);
}

type ClaimedPost = {
  id: string;
  platform: MetaPostPayload["platform"];
  content: string;
  media: string[] | null;
  account_id: string;
  attempts: number;
  social_accounts: { external_id: string; encrypted_token: string; token_expires_at?: string | null } | Array<{ external_id: string; encrypted_token: string; token_expires_at?: string | null }>;
};

/**
 * Publishes all due scheduled posts. The caller must pass a client with
 * sufficient privileges: a service-role client (scheduler cron) or an
 * authenticated user session. Atomic SCHEDULED -> PUBLISHING claims guarantee
 * a post is never published twice, even under concurrent workers.
 */
export async function processDueMetaPosts(supabase: SupabaseClient, limit = 20) {
  // Recover posts stuck in PUBLISHING: a worker that dies mid-publish leaves its
  // claim behind forever, so requeue stale claims. Once the attempt budget is
  // exhausted the post is failed instead of being retried again. The status is
  // re-checked in the update so a worker that is still legitimately publishing
  // (its row moved on after the select) is never overwritten back to SCHEDULED.
  const staleBefore = new Date(Date.now() - STALE_PUBLISHING_MS).toISOString();
  const { data: stuck } = await supabase.from("scheduled_posts").select("id,attempts").eq("status", "PUBLISHING").lt("updated_at", staleBefore);
  for (const post of (stuck || []) as Array<{ id: string; attempts: number | null }>) {
    const patch = (post.attempts ?? 0) >= MAX_ATTEMPTS
      ? { status: "FAILED", error: "Publish was interrupted and the retry budget was exhausted.", updated_at: new Date().toISOString() }
      : { status: "SCHEDULED", updated_at: new Date().toISOString() };
    await supabase.from("scheduled_posts").update(patch).eq("id", post.id).eq("status", "PUBLISHING");
  }

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id,platform,content,media,account_id,attempts,social_accounts!inner(external_id,encrypted_token,token_expires_at)")
    .eq("status", "SCHEDULED")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(limit);

  let processed = 0;
  const rows = (posts || []) as ClaimedPost[];

  const publishRow = async (row: ClaimedPost) => {
    const account = Array.isArray(row.social_accounts) ? row.social_accounts[0] : row.social_accounts;

    // Atomic claim: only one worker can move a post from SCHEDULED to PUBLISHING,
    // which prevents the same post from being published twice.
    const claim = await supabase
      .from("scheduled_posts")
      .update({ status: "PUBLISHING", attempts: row.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "SCHEDULED")
      .select("id")
      .maybeSingle();
    if (!claim.data) return;

    const attemptNumber = row.attempts + 1;
    try {
      if (!account?.encrypted_token) throw new MetaError("META_ACCOUNT_ERROR", "No token stored for this account.");
      if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) throw new MetaError("META_AUTH_ERROR", "Meta token expired.");
      // A corrupt or legacy-format token will never decrypt, so fail the post
      // immediately instead of burning the retry budget on it.
      let token: string;
      try {
        token = decrypt(account.encrypted_token);
      } catch {
        throw new MetaError("META_ACCOUNT_ERROR", "Stored Meta token is corrupted. Reconnect the account.");
      }
      const media = Array.isArray(row.media) ? row.media : [];
      const payload: MetaPostPayload = {
        platform: row.platform,
        mediaType: media.length > 1 ? "CAROUSEL" : media.length === 1 ? "IMAGE" : "TEXT",
        caption: row.content,
        mediaUrls: media,
        targetAccountId: account.external_id
      };
      const result = await publishToPlatform(payload, token);
      if (!result.success) throw new MetaError("META_API_ERROR", result.message);
      // The status guard keeps every terminal transition owned by the worker
      // that holds the PUBLISHING claim. Without it, a retry/failure write from
      // a slower worker could overwrite a row another worker already moved to
      // PUBLISHED, resurrecting it as SCHEDULED and publishing it twice.
      await supabase
        .from("scheduled_posts")
        .update({
          status: "PUBLISHED",
          published_at: result.publishedAt || new Date().toISOString(),
          external_post_id: result.postId,
          external_url: result.url || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", row.id)
        .eq("status", "PUBLISHING");
      await supabase.from("publishing_attempts").insert({
        scheduled_post_id: row.id,
        attempt: attemptNumber,
        status: "PUBLISHED",
        error_message: null
      });
      processed++;
    } catch (error) {
      const metaError = error instanceof MetaError ? error : new MetaError("META_API_ERROR", error instanceof Error ? error.message : "Meta publish failed.");
      const retryable = metaError.code === "META_RATE_LIMIT" || metaError.code === "META_TIMEOUT" || metaError.code === "META_API_ERROR";
      const shouldRetry = attemptNumber < MAX_ATTEMPTS && retryable;
      if (shouldRetry) {
        const delayMs = metaError.code === "META_RATE_LIMIT" ? Math.max((metaError.retryAfter || 60) * 1000, backoffDelayMs(attemptNumber)) : backoffDelayMs(attemptNumber);
        await supabase
          .from("scheduled_posts")
          .update({ status: "SCHEDULED", scheduled_at: new Date(Date.now() + delayMs).toISOString(), updated_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("status", "PUBLISHING");
      } else {
        await supabase.from("scheduled_posts").update({ status: "FAILED", error: metaError.message, updated_at: new Date().toISOString() }).eq("id", row.id).eq("status", "PUBLISHING");
      }
      await supabase.from("publishing_attempts").insert({
        scheduled_post_id: row.id,
        attempt: attemptNumber,
        status: shouldRetry ? "RETRY" : "FAILED",
        error_code: metaError.code,
        error_message: metaError.message
      });
    }
  };

  await mapLimit(rows, PUBLISH_CONCURRENCY, publishRow);
  return { processed };
}
