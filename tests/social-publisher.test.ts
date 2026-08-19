import { afterEach, describe, expect, it, vi } from "vitest";
import { publishToPlatform, safePublishResponse } from "@/lib/social-publisher";
import { MetaError } from "@/lib/meta-errors";

function installFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown; headers?: Record<string, string> }) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body, headers } = handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("publishToPlatform", () => {
  it("returns normalized success with postId, url and publishedAt", async () => {
    installFetch((url) => {
      if (url.includes("/feed")) return { status: 200, body: { id: "fb_1" } };
      if (url.includes("fields=permalink_url")) return { status: 200, body: { permalink_url: "https://facebook.com/p/fb_1" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await publishToPlatform({ platform: "facebook", mediaType: "TEXT", caption: "hi", targetAccountId: "page_1" }, "token");
    expect(result).toEqual({ success: true, platform: "facebook", postId: "fb_1", url: "https://facebook.com/p/fb_1", publishedAt: expect.any(String), status: "PUBLISHED" });
  });

  it("never reports success without a Meta-confirmed id", async () => {
    installFetch(() => ({ status: 200, body: {} }));
    await expect(publishToPlatform({ platform: "threads", mediaType: "TEXT", caption: "hi" }, "token")).rejects.toMatchObject({ code: "META_API_ERROR" });
  });

  it("maps a permission error to a safe failure payload", async () => {
    const failure = safePublishResponse(new MetaError("META_PERMISSION_ERROR", "Instagram publishing permission is required."), "instagram");
    expect(failure).toEqual({ success: false, platform: "instagram", errorCode: "META_PERMISSION_ERROR", message: "Instagram publishing permission is required." });
  });

  it("maps unknown non-Meta errors to META_UNKNOWN_ERROR", () => {
    const failure = safePublishResponse(new Error("boom"), "threads");
    expect(failure).toEqual({ success: false, platform: "threads", errorCode: "META_UNKNOWN_ERROR", message: "Meta publish failed unexpectedly." });
  });
});
