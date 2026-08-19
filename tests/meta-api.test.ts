import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaFacebookService, MetaInstagramService, ThreadsService, assertHttpsMedia } from "@/lib/meta-api";
import { MetaError } from "@/lib/meta-errors";

type FetchHandler = (url: string, init?: RequestInit) => { status: number; body: unknown; headers?: Record<string, string> };

function installFetch(handler: FetchHandler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const { status, body, headers } = handler(url, init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MetaFacebookService", () => {
  it("discovers pages and linked Instagram business accounts", async () => {
    const fetchMock = installFetch((url) => {
      expect(url).toContain("me/accounts");
      return {
        status: 200,
        body: {
          data: [{
            id: "page_1",
            name: "Test Page",
            access_token: "page-token",
            instagram_business_account: { id: "ig_1", username: "test.ig", name: "Test IG", followers_count: 1200 }
          }]
        }
      };
    });
    const pages = await new MetaFacebookService("user-token").pages();
    expect(pages.data).toHaveLength(1);
    expect(pages.data[0].instagram_business_account?.id).toBe("ig_1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("publishes an image post through /photos", async () => {
    installFetch((url, init) => {
      if (url.includes("/photos")) {
        expect(new URLSearchParams(String(init?.body)).get("url")).toBe("https://cdn.example.com/img.jpg");
        return { status: 200, body: { id: "photo_1" } };
      }
      if (url.includes("fields=permalink_url")) return { status: 200, body: { id: "photo_1", permalink_url: "https://facebook.com/photo_1" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new MetaFacebookService("token").publish("page_1", { message: "Hello", imageUrl: "https://cdn.example.com/img.jpg" });
    expect(result.id).toBe("photo_1");
    expect(result.permalink).toBe("https://facebook.com/photo_1");
  });

  it("publishes a text post through /feed", async () => {
    installFetch((url, init) => {
      if (url.includes("/feed")) {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get("message")).toBe("Hello world");
        return { status: 200, body: { id: "feed_1" } };
      }
      if (url.includes("fields=permalink_url")) return { status: 200, body: { permalink_url: undefined } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new MetaFacebookService("token").publish("page_1", { message: "Hello world" });
    expect(result.id).toBe("feed_1");
  });

  it("maps a 403 permission error", async () => {
    installFetch(() => ({ status: 403, body: { error: { code: 10, message: "Permission denied" } } }));
    await expect(new MetaFacebookService("token").pages()).rejects.toMatchObject({ code: "META_PERMISSION_ERROR" });
  });

  it("maps an expired token error", async () => {
    installFetch(() => ({ status: 400, body: { error: { code: 190, message: "Session has expired" } } }));
    await expect(new MetaFacebookService("token").pages()).rejects.toMatchObject({ code: "META_AUTH_ERROR" });
  });
});

describe("MetaInstagramService", () => {
  it("rejects non-HTTPS media", () => {
    expect(() => assertHttpsMedia("http://cdn.example.com/img.jpg")).toThrow(MetaError);
    expect(() => assertHttpsMedia("https://localhost:3000/img.jpg")).toThrow(MetaError);
  });

  it("publishes a single image: container, then media_publish", async () => {
    const calls: string[] = [];
    installFetch((url, init) => {
      calls.push(url);
      if (url.includes("/media") && !url.includes("media_publish") && String(init?.method ?? "GET") === "POST") {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get("media_type")).toBe("IMAGE");
        expect(body.get("image_url")).toBe("https://cdn.example.com/img.jpg");
        return { status: 200, body: { id: "container_1" } };
      }
      if (url.includes("/media_publish")) {
        expect(new URLSearchParams(String(init?.body)).get("creation_id")).toBe("container_1");
        return { status: 200, body: { id: "published_1" } };
      }
      if (url.includes("fields=permalink")) return { status: 200, body: { id: "published_1", permalink: "https://instagram.com/p/abc/" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new MetaInstagramService("token").publish("ig_1", { platform: "instagram", mediaType: "IMAGE", caption: "Hi", mediaUrls: ["https://cdn.example.com/img.jpg"] });
    expect(result.id).toBe("published_1");
    expect(result.permalink).toBe("https://instagram.com/p/abc/");
    expect(calls.some((call) => call.includes("/media_publish"))).toBe(true);
  });

  it("publishes a carousel by creating child containers first", async () => {
    const childIds: string[] = [];
    installFetch((url, init) => {
      const isCreate = url.includes("/media") && !url.includes("media_publish") && String(init?.method ?? "GET") === "POST";
      if (isCreate) {
        const body = new URLSearchParams(String(init?.body));
        if (body.get("is_carousel_item") === "true") {
          const id = `child_${childIds.length + 1}`;
          childIds.push(id);
          return { status: 200, body: { id } };
        }
        expect(body.get("media_type")).toBe("CAROUSEL");
        expect(body.get("children")).toBe("child_1,child_2");
        return { status: 200, body: { id: "carousel_container" } };
      }
      if (url.includes("fields=status_code") || url.includes("fields=status")) return { status: 200, body: { id: "carousel_container", status_code: "FINISHED" } };
      if (url.includes("/media_publish")) return { status: 200, body: { id: "published_carousel" } };
      if (url.includes("fields=permalink")) return { status: 200, body: { id: "published_carousel", permalink: "https://instagram.com/p/car/" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new MetaInstagramService("token").publish("ig_1", {
      platform: "instagram",
      mediaType: "CAROUSEL",
      caption: "Swipe",
      mediaUrls: ["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"]
    });
    expect(childIds).toEqual(["child_1", "child_2"]);
    expect(result.id).toBe("published_carousel");
  });

  it("polls a video container until FINISHED, then publishes", async () => {
    let pollCount = 0;
    installFetch((url, init) => {
      if (url.includes("/media") && !url.includes("media_publish") && String(init?.method ?? "GET") === "POST") {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get("media_type")).toBe("REELS");
        expect(body.get("video_url")).toBe("https://cdn.example.com/reel.mp4");
        return { status: 200, body: { id: "reel_container" } };
      }
      if (url.includes("fields=status_code") || url.includes("fields=status")) {
        pollCount++;
        return { status: 200, body: { id: "reel_container", status_code: pollCount > 1 ? "FINISHED" : "IN_PROGRESS" } };
      }
      if (url.includes("/media_publish")) return { status: 200, body: { id: "published_reel" } };
      if (url.includes("fields=permalink")) return { status: 200, body: { id: "published_reel", permalink: "https://instagram.com/reel/r/" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new MetaInstagramService("token").publish("ig_1", { platform: "instagram", mediaType: "VIDEO", caption: "Reel", mediaUrls: ["https://cdn.example.com/reel.mp4"] });
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(result.id).toBe("published_reel");
  });

  it("fails when the container reports ERROR", async () => {
    installFetch((url, init) => {
      if (url.includes("/media") && String(init?.method ?? "GET") === "POST") return { status: 200, body: { id: "bad_container" } };
      if (url.includes("fields=status")) return { status: 200, body: { id: "bad_container", status_code: "ERROR", error: { message: "Unsupported format" } } };
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(
      new MetaInstagramService("token").publish("ig_1", { platform: "instagram", mediaType: "VIDEO", caption: "x", mediaUrls: ["https://cdn.example.com/reel.mp4"] })
    ).rejects.toMatchObject({ code: "META_API_ERROR" });
  });

  it("maps rate limiting with retry-after", async () => {
    installFetch(() => ({ status: 429, body: { error: { code: 4, message: "Rate limit" } }, headers: { "retry-after": "37" } }));
    const error = await new MetaInstagramService("token").media("ig_1").catch((e: MetaError) => e);
    expect(error).toMatchObject({ code: "META_RATE_LIMIT", retryAfter: 37 });
  });
});

describe("ThreadsService", () => {
  it("reads the profile", async () => {
    const fetchMock = installFetch((url) => {
      expect(url).toContain("graph.threads.net");
      expect(url).toContain("me?fields=id,username,name,threads_profile_picture_url");
      return { status: 200, body: { id: "threads_1", username: "tester" } };
    });
    const profile = await new ThreadsService("token").profile();
    expect(profile.username).toBe("tester");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("publishes a text thread in two steps", async () => {
    installFetch((url, init) => {
      if (url.includes("/me/threads") && !url.includes("threads_publish") && String(init?.method ?? "GET") === "POST") {
        expect(new URLSearchParams(String(init?.body)).get("media_type")).toBe("TEXT");
        return { status: 200, body: { id: "container_t" } };
      }
      if (url.includes("/me/threads_publish")) {
        expect(new URLSearchParams(String(init?.body)).get("creation_id")).toBe("container_t");
        return { status: 200, body: { id: "thread_42" } };
      }
      if (url.includes("fields=permalink")) return { status: 200, body: { id: "thread_42", permalink: "https://threads.net/@tester/post/42" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new ThreadsService("token").publish({ text: "Hello threads" });
    expect(result.id).toBe("thread_42");
    expect(result.permalink).toBe("https://threads.net/@tester/post/42");
  });

  it("publishes a video thread after container FINISHED", { timeout: 30_000 }, async () => {
    let pollCount = 0;
    installFetch((url, init) => {
      if (url.includes("/me/threads") && !url.includes("threads_publish") && String(init?.method ?? "GET") === "POST") {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get("media_type")).toBe("VIDEO");
        return { status: 200, body: { id: "container_v" } };
      }
      if (url.includes("fields=status,error")) {
        pollCount++;
        return { status: 200, body: { id: "container_v", status: pollCount > 1 ? "FINISHED" : "IN_PROGRESS" } };
      }
      if (url.includes("/me/threads_publish")) return { status: 200, body: { id: "thread_v" } };
      if (url.includes("fields=permalink")) return { status: 200, body: { id: "thread_v", permalink: "https://threads.net/post/v" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await new ThreadsService("token").publish({ text: "Video", mediaUrl: "https://cdn.example.com/v.mp4", mediaType: "VIDEO" });
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(result.id).toBe("thread_v");
  });

  it("fails when the media container errors", async () => {
    installFetch((url, init) => {
      if (url.includes("/me/threads") && String(init?.method ?? "GET") === "POST") return { status: 200, body: { id: "container_bad" } };
      if (url.includes("fields=status,error")) return { status: 200, body: { id: "container_bad", status: "ERROR", error: { message: "bad media" } } };
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(new ThreadsService("token").publish({ text: "x", mediaUrl: "https://cdn.example.com/v.mp4", mediaType: "VIDEO" })).rejects.toMatchObject({ code: "META_API_ERROR" });
  });

  it("throws META_INVALID_MEDIA for missing media on a media post", async () => {
    installFetch(() => ({ status: 200, body: {} }));
    await expect(new ThreadsService("token").publish({ text: "x", mediaType: "IMAGE" })).rejects.toMatchObject({ code: "META_INVALID_MEDIA" });
  });
});
