import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaAccount } from "@/lib/meta-api";
import { graphRequest, ThreadsService } from "@/lib/meta-api";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { mapLimit } from "@/lib/async";

export type AnalyticsPost = {
  platform: string;
  post: string;
  date: string;
  likes: string;
  comments: string;
  shares: string;
  reach: string;
  status: "Live";
};

export type AnalyticsSnapshot = {
  success: boolean;
  live: boolean;
  cached?: boolean;
  accounts: MetaAccount[];
  metrics: Array<{ label: string; value: number; suffix: string; detail: string }>;
  engagementData: Array<{ label: string; engagement: number; comments: number }>;
  platformBreakdown: Array<{ name: string; value: number }>;
  postingData: Array<{ label: string; value: number }>;
  growthData: Array<{ label: string; followers: number }>;
  sentimentData: Array<{ label: string; score: number }>;
  recentPosts: AnalyticsPost[];
  memoryItems: string[];
  recommendations: Array<[string, string, string]>;
  error?: string;
};

type StoredAccount = {
  id: string;
  external_id: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  platform: string;
  parent_account_id: string | null;
  encrypted_token: string | null;
  created_at: string;
};

type InsightRow = {
  name: string;
  values?: Array<{ value?: InsightValue; end_time?: string }>;
};

type InsightValue = number | Record<string, number>;

type GraphPost = {
  id: string;
  caption?: string;
  message?: string;
  timestamp?: string;
  created_time?: string;
  permalink?: string;
  permalink_url?: string;
  like_count?: number;
  comments_count?: number;
  shares?: { count?: number };
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
};

const emptyAnalytics = (error: string): AnalyticsSnapshot => ({
  success: false,
  live: false,
  accounts: [],
  metrics: [],
  engagementData: [],
  platformBreakdown: [],
  postingData: [],
  growthData: [],
  sentimentData: [],
  recentPosts: [],
  memoryItems: [],
  recommendations: [],
  error
});

/** Graph API call returning the `data` envelope. Tokens travel in the Authorization header, never the URL. */
async function graphData<T>(token: string, path: string): Promise<T> {
  const body = await graphRequest<{ data: T }>("facebook", path, token);
  return body.data;
}

function isTokenConfigured(token?: string) {
  return Boolean(token && token.length > 20);
}

function numericValue(value: InsightValue | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Object.values(value).reduce((total, item) => total + (Number(item) || 0), 0);
}

function sumInsight(rows: InsightRow[], names: string[]) {
  return rows.filter((row) => names.includes(row.name)).flatMap((row) => row.values ?? []).reduce((total, item) => total + numericValue(item.value), 0);
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function expandCompact(value: string) {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  if (value.includes("M")) return numeric * 1_000_000;
  if (value.includes("K")) return numeric * 1_000;
  return numeric || 0;
}

/**
 * Sorts a date-keyed engagement map chronologically (most recent last, with
 * unknown-date entries treated as newest) and keeps the newest 14 days, then
 * formats the keys for display.
 */
function toEngagementTimeline(daily: Map<string, { engagement: number; comments: number }>) {
  return Array.from(daily, ([key, values]) => ({ key, ...values }))
    .sort((a, b) => (a.key === "recent" ? 1 : b.key === "recent" ? -1 : a.key.localeCompare(b.key)))
    .slice(-14)
    .map(({ key, engagement, comments }) => ({
      label: key === "recent" ? "Recent" : new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      engagement,
      comments
    }));
}

function accountFromStored(row: StoredAccount): MetaAccount[] {
  return [{
    id: row.external_id ?? row.id,
    name: row.display_name ?? row.username ?? row.id,
    platform: row.platform as MetaAccount["platform"],
    handle: row.platform === "instagram" && row.username ? `@${row.username}` : row.display_name ?? row.id,
    avatarUrl: row.avatar_url ?? undefined,
    connectedAt: row.created_at ?? new Date().toISOString(),
    status: "active"
  }];
}

type ThreadsInsightsResult = {
  accounts: MetaAccount[];
  posts: AnalyticsPost[];
  reach: number;
  engaged: number;
  followers: number;
  postingCount: number;
  engagementDaily: Array<{ key: string; engagement: number; comments: number }>;
};

const THREADS_METRICS = "views,likes,replies,reposts,quotes";

async function fetchThreadsAnalytics(token: string): Promise<ThreadsInsightsResult> {
  const service = new ThreadsService(token);
  const [profile, userInsights, posts] = await Promise.all([
    service.profile().catch(() => undefined),
    service.userInsights(`${THREADS_METRICS},followers_count`).catch(() => undefined),
    service.posts().catch(() => undefined)
  ]);
  const accounts: MetaAccount[] = profile
    ? [{
        id: profile.id,
        name: profile.name || profile.username || profile.id,
        platform: "threads",
        handle: profile.username ? `@${profile.username}` : profile.id,
        avatarUrl: profile.threads_profile_picture_url,
        connectedAt: new Date().toISOString(),
        status: "active"
      }]
    : [];

  const totalValues = new Map<string, number>();
  (userInsights?.data || []).forEach((row) => {
    totalValues.set(row.name, sumInsight([row], [row.name]));
  });

  // Per-post insight calls are fanned out with a small concurrency cap to avoid
  // tripping Meta's rate limits with a burst of parallel requests.
  const postsWithInsights = await mapLimit((posts?.data || []).slice(0, 25), 5, async (post) => {
    const insights = await service.mediaInsights(post.id, THREADS_METRICS).catch(() => undefined);
    const values = new Map<string, number>();
    (insights?.data || []).forEach((row) => values.set(row.name, sumInsight([row], [row.name])));
    return { post, values };
  });

  const postRows = postsWithInsights.map(({ post, values }): AnalyticsPost => ({
    platform: "Threads",
    post: post.text || "Untitled thread",
    date: post.timestamp ? new Date(post.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
    likes: compact(values.get("likes") ?? 0),
    comments: compact(values.get("replies") ?? 0),
    shares: compact((values.get("reposts") ?? 0) + (values.get("quotes") ?? 0)),
    reach: compact(values.get("views") ?? 0),
    status: "Live"
  }));

  // Keyed by ISO date (not a formatted label) so entries can be merged and
  // sorted reliably across platforms; "recent" is a fallback for missing
  // timestamps that sorts last (newest).
  const daily = new Map<string, { engagement: number; comments: number }>();
  postsWithInsights.forEach(({ post, values }) => {
    const key = post.timestamp ? post.timestamp.slice(0, 10) : "recent";
    const current = daily.get(key) ?? { engagement: 0, comments: 0 };
    current.engagement += (values.get("likes") ?? 0) + (values.get("replies") ?? 0) + (values.get("reposts") ?? 0) + (values.get("quotes") ?? 0);
    current.comments += values.get("replies") ?? 0;
    daily.set(key, current);
  });

  return {
    accounts,
    posts: postRows,
    reach: totalValues.get("views") ?? postRows.reduce((total, row) => total + expandCompact(row.reach), 0),
    engaged: (totalValues.get("likes") ?? 0) + (totalValues.get("replies") ?? 0) + (totalValues.get("reposts") ?? 0) + (totalValues.get("quotes") ?? 0),
    followers: totalValues.get("followers_count") ?? 0,
    postingCount: (posts?.data || []).length,
    engagementDaily: Array.from(daily, ([key, values]) => ({ key, ...values }))
  };
}

async function firstActiveAccountId(supabase: SupabaseClient, workspaceId: string) {
  const { data } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .not("encrypted_token", "is", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function readAnalyticsCache(supabase: SupabaseClient, accountId: string | null) {
  if (!accountId) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("analytics_cache")
    .select("payload")
    .eq("social_account_id", accountId)
    .eq("metric_date", today)
    .maybeSingle();
  const payload = data?.payload as AnalyticsSnapshot | undefined;
  // Snapshots that carry an error (e.g. a metric Graph API rejected) are
  // treated as stale: serving them would replay the failure for a whole day.
  if (payload && payload.success && !payload.error) return payload;
  return null;
}

async function writeAnalyticsCache(supabase: SupabaseClient, accountId: string | null, snapshot: AnalyticsSnapshot) {
  if (!accountId || !snapshot.live) return;
  const today = new Date().toISOString().slice(0, 10);
  // The table's unique key is (social_account_id, metric_date); upserting on
  // the primary key instead would hit that constraint and silently fail on
  // every write after the first one of the day.
  await supabase.from("analytics_cache").upsert(
    { social_account_id: accountId, metric_date: today, payload: snapshot },
    { onConflict: "social_account_id,metric_date" }
  );
}

export async function fetchMetaAnalytics(token?: string, bypassCache = false): Promise<AnalyticsSnapshot> {
  const supabase = await createClient();
  let member: { workspace_id: string } | null = null;
  let stored: StoredAccount[] = [];
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
      member = membership || null;
      if (member) {
        const { data: rows } = await supabase
          .from("social_accounts")
          .select("id,external_id,display_name,username,avatar_url,platform,parent_account_id,encrypted_token,created_at")
          .eq("workspace_id", member.workspace_id)
          .eq("status", "active");
        stored = (rows ?? []) as StoredAccount[];
      }
    }
  }

  // Accounts store page-scoped tokens, so insights are fetched per node with
  // that node's own token. There is deliberately no /me/accounts enumeration:
  // that user-scoped endpoint cannot be called with a page access token.
  const tokens = new Map<string, string>();
  for (const row of stored) {
    if (!row.encrypted_token) continue;
    try {
      tokens.set(row.id, decrypt(row.encrypted_token));
    } catch {
      // Unreadable token: the account is skipped below instead of failing the
      // whole snapshot.
    }
  }
  if (!isTokenConfigured(token) && tokens.size === 0) return emptyAnalytics("Connect Meta to load live analytics.");

  const cacheAccountId = supabase && member ? await firstActiveAccountId(supabase, member.workspace_id) : null;
  if (!bypassCache) {
    const cached = await readAnalyticsCache(supabase!, cacheAccountId);
    if (cached) return { ...cached, cached: true };
  }

  try {
    const accounts = stored.flatMap(accountFromStored);
    const errors: string[] = [];

    let threads: ThreadsInsightsResult | null = null;
    if (supabase && member) {
      const { data: threadsAccount } = await supabase.from("social_accounts").select("encrypted_token,token_expires_at").eq("workspace_id", member.workspace_id).eq("platform", "threads").eq("status", "active").limit(1).maybeSingle();
      if (threadsAccount?.encrypted_token && (!threadsAccount.token_expires_at || new Date(threadsAccount.token_expires_at) > new Date())) {
        try { threads = await fetchThreadsAnalytics(decrypt(threadsAccount.encrypted_token)); } catch (error) { errors.push(error instanceof Error ? error.message : "Threads insights unavailable."); }
      }
    }

    const pageResults = await Promise.all(stored.filter((row) => row.platform === "facebook" && row.external_id && tokens.has(row.id)).map(async (row) => {
      const pageToken = tokens.get(row.id)!;
      const instagramChildren = stored.filter((child) => child.platform === "instagram" && child.parent_account_id === row.id && child.external_id);
      const [pageInsights, pagePosts, pageFans, childResults] = await Promise.all([
        graphData<InsightRow[]>(pageToken, `${row.external_id!}/insights?metric=page_views_total,page_post_engagements&period=day&date_preset=last_28d`).catch((error) => { errors.push(error instanceof Error ? error.message : "Page insights unavailable."); return []; }),
        graphData<GraphPost[]>(pageToken, `${row.external_id!}/posts?fields=id,message,created_time,permalink_url,shares&limit=25`).catch((error) => { errors.push(error instanceof Error ? error.message : "Page posts unavailable."); return []; }),
        // Profile fields (fan_count, followers_count) return a flat object,
        // not a {data: [...]} envelope — graphData unwraps the envelope, so
        // these must go through graphRequest directly.
        graphRequest<{ fan_count?: number }>("facebook", `${row.external_id!}?fields=fan_count`, pageToken).catch((): { fan_count?: number } => ({})),
        Promise.all(instagramChildren.map(async (child) => {
          const childToken = tokens.get(child.id) ?? pageToken;
          const [insights, media, profile] = await Promise.all([
            graphData<InsightRow[]>(childToken, `${child.external_id!}/insights?metric=reach,accounts_engaged,total_interactions&period=day&date_preset=last_28d`).catch((error) => { errors.push(error instanceof Error ? error.message : "Instagram insights unavailable."); return []; }),
            graphData<GraphPost[]>(childToken, `${child.external_id!}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=25`).catch((error) => { errors.push(error instanceof Error ? error.message : "Instagram media unavailable."); return []; }),
            graphRequest<{ followers_count?: number }>("facebook", `${child.external_id!}?fields=followers_count`, childToken).catch((): { followers_count?: number } => ({})),
          ]);
          return { insights, media, followers: profile.followers_count };
        }))
      ]);
      return {
        pageInsights,
        pagePosts,
        instagramInsights: childResults.flatMap((result) => result.insights),
        instagramPosts: childResults.flatMap((result) => result.media),
        pageLabel: row.display_name ?? row.external_id!,
        fanCount: pageFans.fan_count,
        instagramFollowers: instagramChildren.map((child, index) => ({ label: child.username ? `@${child.username}` : child.display_name ?? child.external_id!, followers: childResults[index]?.followers })).filter((item): item is { label: string; followers: number } => item.followers !== undefined)
      };
    }));

    const insightGroups = pageResults.flatMap((result) => [
      { platform: "Facebook Pages", rows: result.pageInsights },
      { platform: "Instagram Business", rows: result.instagramInsights }
    ]);
    if (threads) insightGroups.push({ platform: "Threads", rows: [] });
    const allRows = insightGroups.flatMap((group) => group.rows);
    const reach = sumInsight(allRows, ["page_views_total", "reach"]) + (threads?.reach ?? 0);
    // One metric per platform: page_post_engagements counts every engagement on
    // a Page's posts, total_interactions every interaction on Instagram posts.
    // accounts_engaged counts *unique* people who engaged, so summing both
    // families would roughly double-count the same actions. Reach is derived
    // from page_views_total because page_impressions is rejected for
    // dev-mode page tokens (Graph API v26 returns "invalid metric").
    const engaged = sumInsight(allRows, ["page_post_engagements", "total_interactions"]) + (threads?.engaged ?? 0);
    const postCount = pageResults.reduce((total, result) => total + result.pagePosts.length + result.instagramPosts.length, 0) + (threads?.postingCount ?? 0);

    const daily = new Map<string, { engagement: number; comments: number }>();
    allRows.filter((row) => ["page_post_engagements", "total_interactions"].includes(row.name)).forEach((row) => {
      (row.values ?? []).forEach((item) => {
        const key = item.end_time ? item.end_time.slice(0, 10) : "recent";
        const current = daily.get(key) ?? { engagement: 0, comments: 0 };
        current.engagement += numericValue(item.value);
        daily.set(key, current);
      });
    });
    (threads?.engagementDaily ?? []).forEach((item) => {
      const current = daily.get(item.key) ?? { engagement: 0, comments: 0 };
      current.engagement += item.engagement;
      current.comments += item.comments;
      daily.set(item.key, current);
    });

    const platformTotals = insightGroups.map((group) => ({ name: group.platform, value: sumInsight(group.rows, ["page_post_engagements", "total_interactions"]) + (group.platform === "Threads" ? (threads?.engaged ?? 0) : 0) }));
    const platformTotal = platformTotals.reduce((total, item) => total + item.value, 0);
    const posts = [
      ...pageResults.flatMap((result) => [
        ...result.pagePosts.map((post) => ({ post, platform: "Facebook Pages" })),
        ...result.instagramPosts.map((post) => ({ post, platform: "Instagram Business" }))
      ]).map(({ post, platform }): AnalyticsPost => ({
        platform,
        post: post.caption || post.message || "Untitled post",
        date: post.timestamp ? new Date(post.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
        likes: compact(post.like_count ?? post.likes?.summary?.total_count ?? 0),
        comments: compact(post.comments_count ?? post.comments?.summary?.total_count ?? 0),
        shares: compact(post.shares?.count ?? 0),
        reach: "—",
        status: "Live"
      })),
      ...(threads?.posts ?? [])
    ];
    const topPost = [...posts].sort((a, b) => {
      const score = (post: AnalyticsPost) => expandCompact(post.likes) + expandCompact(post.comments) + expandCompact(post.shares);
      return score(b) - score(a);
    })[0];

const followers = [
      ...pageResults.flatMap((result) => result.fanCount !== undefined ? [{ label: result.pageLabel, followers: result.fanCount }] : []),
      ...pageResults.flatMap((result) => result.instagramFollowers),
      ...(threads?.followers ? [{ label: "Threads", followers: threads.followers }] : [])
    ];

    const metrics = [
      { label: "Views (28d)", value: reach, suffix: "", detail: "Live Meta Graph data" },
      { label: "Engagement (28d)", value: engaged, suffix: "", detail: "Live Meta Graph data" },
      { label: "Published posts", value: postCount, suffix: "", detail: "Returned by Meta" },
      { label: "Engagement rate", value: reach ? Number(((engaged / reach) * 100).toFixed(1)) : 0, suffix: "%", detail: "Calculated from Meta data" }
    ];

    const snapshot: AnalyticsSnapshot = {
      success: true,
      live: true,
      accounts: [...accounts, ...(threads?.accounts ?? [])],
      metrics,
      engagementData: toEngagementTimeline(daily),
      platformBreakdown: platformTotal ? platformTotals.map((item) => ({ name: item.name, value: Math.round((item.value / platformTotal) * 100) })).filter((item) => item.value > 0) : [],
      postingData: [
        { label: "Instagram", value: pageResults.reduce((total, result) => total + result.instagramPosts.length, 0) },
        { label: "Facebook", value: pageResults.reduce((total, result) => total + result.pagePosts.length, 0) },
        ...(threads?.postingCount ? [{ label: "Threads", value: threads.postingCount }] : [])
      ].filter((item) => item.value > 0),
      growthData: followers,
      sentimentData: [],
      recentPosts: posts.slice(0, 25),
      memoryItems: [
        accounts.length ? `${accounts.length} connected Meta account${accounts.length === 1 ? "" : "s"} returned by Graph API.` : "Meta returned no linked accounts for this token.",
        posts.length ? `The latest ${posts.length} returned post${posts.length === 1 ? "" : "s"} are available for analysis.` : "Meta returned no recent posts for the connected accounts.",
        topPost ? `Highest recent interaction volume: ${topPost.likes} likes, ${topPost.comments} comments, and ${topPost.shares} shares.` : "Interaction history will appear when Meta returns post data."
      ],
      recommendations: topPost ? [[
        "Review and repurpose the strongest recent Meta post",
        `Based on ${topPost.date}`,
        `This post led the returned sample with ${topPost.likes} likes, ${topPost.comments} comments, and ${topPost.shares} shares. Use its topic and format as the next experiment.`
      ]] : [],
      ...(errors.length ? { error: errors[0] } : {})
    };

    if (supabase) await writeAnalyticsCache(supabase, cacheAccountId, snapshot);
    return snapshot;
  } catch (error) {
    return emptyAnalytics(error instanceof Error ? error.message : "Unable to load Meta analytics.");
  }
}
