/**
 * Regression guard for read-aloud replies.
 *
 * The TTS endpoint returns a WAV that the client plays from a blob: URL created
 * with URL.createObjectURL. CSP has no `media-src`, so media loads fell back to
 * `default-src 'self'` — and 'self' does not name blob:. Every synthesised clip
 * was therefore blocked, the <audio> element fired `error`, and the message
 * showed "Could not play this reply." even though the fetch had succeeded.
 */
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../proxy";

/** Parses a `a b; c d` policy into `{ a: "b", c: "d" }`. */
function parsePolicy(policy: string): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const part of policy.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    directives[tokens[0]] = tokens.slice(1).join(" ");
  }
  return directives;
}

describe("content security policy (proxy.ts)", () => {
  const directives = parsePolicy(contentSecurityPolicy("test-nonce"));

  it("permits blob: media so synthesised replies can play", () => {
    // An explicit media-src is required: without one the directive falls back
    // to default-src, which is 'self' only.
    expect(directives["media-src"], "media-src must be declared explicitly").toBeTruthy();
    expect(directives["media-src"].split(" ")).toContain("blob:");
  });

  it("does not widen script execution while fixing media", () => {
    expect(directives["script-src"]).toContain("'strict-dynamic'");
    expect(directives["script-src"]).toContain("'nonce-test-nonce'");
    expect(directives["object-src"]).toBe("'none'");
    expect(directives["default-src"]).toBe("'self'");
  });

  it("keeps the image and connect allowances the rest of the app relies on", () => {
    expect(directives["img-src"]).toContain("blob:");
    expect(directives["img-src"]).toContain("data:");
    expect(directives["connect-src"]).toContain("https://*.supabase.co");
  });
});
