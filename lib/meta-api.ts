import { META_GRAPH_VERSION as GRAPH_VERSION } from "@/lib/meta-config";
import { MetaError } from "@/lib/meta-errors";

export type Platform = "instagram" | "facebook" | "threads";
export interface MetaAccount {
  id: string;
  name: string;
  platform: Platform;
  handle: string;
  avatarUrl?: string;
  followers?: number;
  connectedAt: string;
  status: "active" | "token_expiring" | "expired" | "permission_required" | "disconnected";
  pageId?: string;
}
export interface MetaPostPayload {
  platform: Platform;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "TEXT";
  caption: string;
  mediaUrls?: string[];
  scheduledTime?: string;
  hashtags?: string[];
  targetAccountId?: string;
}
type GraphError = { error?: { message?: string; code?: number; error_subcode?: number; is_transient?: boolean } };

/** Wrapper around Facebook / Threads Graph API requests with consistent error normalization. */
export async function graphRequest<T>(base: "facebook" | "threads", path: string, token: string, init: RequestInit = {}): Promise<T> {
  const origin = base === "threads" ? "https://graph.threads.net" : "https://graph.facebook.com";
  const url = new URL(`${origin}/${base === "threads" ? "v1.0" : GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(25_000) });
  const body = (await response.json().catch(() => ({}))) as T & GraphError;
  if (!response.ok || body.error) {
    const code = body.error?.code;
    if (response.status === 401 || code === 190) throw new MetaError("META_AUTH_ERROR", "Meta token expired or invalid.");
    if (response.status === 403 || code === 10 || code === 200) throw new MetaError("META_PERMISSION_ERROR", "Required Meta permission is missing or the account is not authorized for this action.");
    if (response.status === 429 || code === 4 || code === 17 || code === 32) {
      const retryAfter = Number(response.headers.get("retry-after") || 60);
      throw new MetaError("META_RATE_LIMIT", "Meta rate limit reached. Retry later.", Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
    }
    if (code === 100 && /media|container|url/i.test(body.error?.message || "")) throw new MetaError("META_INVALID_MEDIA", body.error?.message || "Meta rejected the media payload.");
    throw new MetaError("META_API_ERROR", body.error?.message || "Meta request failed.");
  }
  return body as T;
}

/** Validates that a media URL is HTTPS and does not point at loopback/private infrastructure. */
export function assertHttpsMedia(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new MetaError("META_INVALID_MEDIA", "Media URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:") throw new MetaError("META_INVALID_MEDIA", "Media URL must use HTTPS.");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "0.0.0.0" || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new MetaError("META_INVALID_MEDIA", "Media URL must point to a public HTTPS host.");
  }
  return parsed.toString();
}

export class MetaFacebookService {
  constructor(private token: string) {}

  pages() {
    return graphRequest<{ data: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string; name?: string; profile_picture_url?: string; followers_count?: number } }> }>(
      "facebook",
      "me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}",
      this.token,
      { method: "GET" }
    );
  }

  /**
   * Publishes to a Page. Images use the /photos endpoint (they become Page photo
   * posts); everything else goes through /feed. Meta must return the post id.
   */
  async publish(pageId: string, input: { message: string; link?: string; imageUrl?: string }) {
    const body = new URLSearchParams();
    if (input.imageUrl) {
      body.set("url", assertHttpsMedia(input.imageUrl));
      body.set("caption", input.message);
      const result = await graphRequest<{ id: string }>("facebook", `${pageId}/photos`, this.token, { method: "POST", body });
      return { id: result.id, permalink: await this.permalink(result.id).catch(() => undefined) };
    }
    body.set("message", input.message);
    if (input.link) body.set("link", assertHttpsMedia(input.link));
    const result = await graphRequest<{ id: string }>("facebook", `${pageId}/feed`, this.token, { method: "POST", body });
    return { id: result.id, permalink: await this.permalink(result.id).catch(() => undefined) };
  }

  permalink(postId: string) {
    return graphRequest<{ permalink_url?: string }>("facebook", `${postId}?fields=permalink_url`, this.token).then((data) => data.permalink_url);
  }

  posts(pageId: string) {
    return graphRequest<{ data: Array<{ id: string; message?: string; created_time?: string; permalink_url?: string; shares?: { count?: number }; likes?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } } }> }>(
      "facebook",
      `${pageId}/posts?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)`,
      this.token
    );
  }

  insights(pageId: string, metric: string, period = "day", datePreset = "last_28d") {
    return graphRequest<{ data: Array<{ name: string; values?: Array<{ value?: number | Record<string, number>; end_time?: string }> }> }>(
      "facebook",
      `${pageId}/insights?metric=${encodeURIComponent(metric)}&period=${period}&date_preset=${datePreset}`,
      this.token
    );
  }
}

export class MetaInstagramService {
  constructor(private token: string) {}

  profile(id: string) {
    return graphRequest<{ id: string; username?: string; name?: string; profile_picture_url?: string; followers_count?: number }>(
      "facebook",
      `${id}?fields=id,username,name,profile_picture_url,followers_count`,
      this.token
    );
  }

  /**
   * Publishes image, reel (video) or carousel media. Carousels require child
   * containers to be created first and referenced by container id — never by
   * raw media URLs. Publication is only reported after Meta confirms it via
   * /media_publish.
   */
  async publish(accountId: string, input: MetaPostPayload): Promise<{ id: string; permalink?: string }> {
    const mediaUrls = (input.mediaUrls || []).map(assertHttpsMedia);
    if (input.mediaType === "TEXT" || mediaUrls.length === 0) throw new MetaError("META_INVALID_MEDIA", "Instagram publishing requires accessible HTTPS media.");

    let creationId: string;
    if (input.mediaType === "CAROUSEL") {
      if (mediaUrls.length < 2 || mediaUrls.length > 10) throw new MetaError("META_INVALID_MEDIA", "Instagram carousels require between 2 and 10 items.");
      const children: string[] = [];
      for (const url of mediaUrls) {
        const childParams = new URLSearchParams({ image_url: url });
        childParams.set("is_carousel_item", "true");
        const child = await graphRequest<{ id: string }>("facebook", `${accountId}/media`, this.token, { method: "POST", body: childParams });
        children.push(child.id);
      }
      // Meta requires every child container to finish processing before the
      // carousel container that references them is created; otherwise the
      // carousel creation fails with a retryable API error.
      for (const childId of children) {
        await this.waitForContainer(childId, 60_000);
      }
      const carouselParams = new URLSearchParams({ media_type: "CAROUSEL", children: children.join(","), caption: input.caption });
      const carousel = await graphRequest<{ id: string }>("facebook", `${accountId}/media`, this.token, { method: "POST", body: carouselParams });
      creationId = carousel.id;
    } else {
      const isReel = input.mediaType === "VIDEO";
      const params = new URLSearchParams({ caption: input.caption });
      if (isReel) {
        params.set("media_type", "REELS");
        params.set("video_url", mediaUrls[0]);
      } else {
        params.set("media_type", "IMAGE");
        params.set("image_url", mediaUrls[0]);
      }
      const container = await graphRequest<{ id: string }>("facebook", `${accountId}/media`, this.token, { method: "POST", body: params });
      creationId = container.id;
    }

    if (input.mediaType !== "IMAGE") {
      await this.waitForContainer(creationId, input.mediaType === "VIDEO" ? 5 * 60_000 : 60_000);
    }

    const published = await graphRequest<{ id: string }>("facebook", `${accountId}/media_publish`, this.token, {
      method: "POST",
      body: new URLSearchParams({ creation_id: creationId })
    });
    const permalink = await this.permalink(published.id).catch(() => undefined);
    return { id: published.id, permalink };
  }

  private async waitForContainer(containerId: string, maxMs: number) {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
      const result = await graphRequest<{ status_code?: string; status?: string; error?: { message?: string } }>(
        "facebook",
        `${containerId}?fields=status_code,status,error`,
        this.token
      );
      const status = result.status_code || result.status;
      if (status === "FINISHED") return;
      if (status === "ERROR") throw new MetaError("META_API_ERROR", result.error?.message || "Instagram could not process this media container.");
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    throw new MetaError("META_TIMEOUT", "Instagram media processing did not finish in time.");
  }

  permalink(mediaId: string) {
    return graphRequest<{ permalink?: string }>("facebook", `${mediaId}?fields=permalink`, this.token).then((data) => data.permalink);
  }

  insights(accountId: string, metrics: string, period = "day", datePreset = "last_28d") {
    return graphRequest<{ data: Array<{ name: string; values?: Array<{ value?: number | Record<string, number>; end_time?: string }> }> }>(
      "facebook",
      `${accountId}/insights?metric=${encodeURIComponent(metrics)}&period=${period}&date_preset=${datePreset}`,
      this.token
    );
  }

  media(accountId: string) {
    return graphRequest<{ data: Array<{ id: string; caption?: string; media_type?: string; timestamp?: string; permalink?: string; like_count?: number; comments_count?: number }> }>(
      "facebook",
      `${accountId}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count`,
      this.token
    );
  }
}

export class ThreadsService {
  constructor(private token: string) {}

  profile() {
    return graphRequest<{ id: string; username?: string; name?: string; threads_profile_picture_url?: string }>(
      "threads",
      "me?fields=id,username,name,threads_profile_picture_url",
      this.token
    );
  }

  /**
   * Two-step Threads publishing: create a container, wait for media processing
   * when required, then publish it. Only the id returned by /threads_publish is
   * reported as the published post id.
   */
  async publish(input: { text: string; mediaUrl?: string; mediaType?: "IMAGE" | "VIDEO" | "TEXT" }): Promise<{ id: string; permalink?: string }> {
    const body = new URLSearchParams({ text: input.text });
    const mediaUrl = input.mediaUrl ? assertHttpsMedia(input.mediaUrl) : undefined;
    const mediaType = input.mediaType || (mediaUrl ? "IMAGE" : "TEXT");

    if (mediaType === "TEXT") {
      body.set("media_type", "TEXT");
    } else if (!mediaUrl) {
      throw new MetaError("META_INVALID_MEDIA", "Threads media posts require an accessible HTTPS media URL.");
    } else {
      body.set("media_type", mediaType);
      if (mediaType === "VIDEO") body.set("video_url", mediaUrl);
      else body.set("image_url", mediaUrl);
    }

    const container = await graphRequest<{ id: string }>("threads", "me/threads", this.token, { method: "POST", body });

    if (mediaType !== "TEXT") await this.waitForContainer(container.id);

    const published = await graphRequest<{ id: string }>("threads", "me/threads_publish", this.token, {
      method: "POST",
      body: new URLSearchParams({ creation_id: container.id })
    });
    const permalink = await this.permalink(published.id).catch(() => undefined);
    return { id: published.id, permalink };
  }

  private async waitForContainer(containerId: string) {
    // Meta recommends polling a container at most once per minute for up to 5 minutes.
    const started = Date.now();
    while (Date.now() - started < 5 * 60_000) {
      const result = await graphRequest<{ status?: string; error?: { message?: string } }>(
        "threads",
        `${containerId}?fields=status,error`,
        this.token
      );
      if (result.status === "FINISHED") return;
      if (result.status === "ERROR") throw new MetaError("META_API_ERROR", result.error?.message || "Threads could not process this media container.");
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
    throw new MetaError("META_TIMEOUT", "Threads media processing did not finish in time.");
  }

  permalink(threadId: string) {
    return graphRequest<{ permalink?: string }>("threads", `${threadId}?fields=permalink`, this.token).then((data) => data.permalink);
  }

  posts() {
    return graphRequest<{ data: Array<{ id: string; text?: string; timestamp?: string; permalink?: string; media_type?: string }> }>(
      "threads",
      "me/threads?fields=id,text,timestamp,permalink,media_type",
      this.token
    );
  }

  /** Per-thread insights. Supported metrics: views, likes, replies, reposts, quotes. */
  mediaInsights(threadId: string, metrics: string) {
    return graphRequest<{ data: Array<{ name: string; values?: Array<{ value?: number | Record<string, number>; end_time?: string }> }> }>(
      "threads",
      `${threadId}/insights?metric=${encodeURIComponent(metrics)}`,
      this.token
    );
  }

  /** User-level totals. Supported metrics: views, likes, replies, reposts, quotes, followers_count. */
  userInsights(metrics: string) {
    return graphRequest<{ data: Array<{ name: string; values?: Array<{ value?: number | Record<string, number>; end_time?: string }> }> }>(
      "threads",
      `me/threads_insights?metric=${encodeURIComponent(metrics)}`,
      this.token
    );
  }
}

export const META_GRAPH_VERSION = GRAPH_VERSION;
