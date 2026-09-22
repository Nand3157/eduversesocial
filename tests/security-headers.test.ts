import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

type HeaderEntry = { key: string; value: string };

/**
 * Regression guard for the microphone bug: `Permissions-Policy` with an empty
 * allowlist (`microphone=()`) denies the feature to the page itself, so
 * getUserMedia() rejects with NotAllowedError even after the user grants the
 * browser permission. These tests fail if anyone "tightens" the policy back
 * to `()`.
 */
async function securityHeaders(): Promise<Record<string, string>> {
  // next.config.mjs is typed via JSDoc; its headers() return type is inferred
  // loosely, so narrow it explicitly to the runtime shape.
  const groups = (await nextConfig.headers()) as unknown as { source: string; headers: HeaderEntry[] }[];
  const all = groups.flatMap((group) => group.headers);
  const map: Record<string, string> = {};
  for (const { key, value } of all) map[key.toLowerCase()] = value;
  return map;
}

/** Parses `a=(self), b=(), c=(self)` into `{ a: "(self)", ... }`. */
function parsePermissionsPolicy(value: string): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    // Allow both `name=(self)` and legacy `name (self)` spellings.
    const match = trimmed.match(/^([a-z-]+)(?:=|\s+)(.*)$/);
    if (match) directives[match[1]] = match[2];
  }
  return directives;
}

describe("security headers (next.config.mjs)", () => {
  it("applies to every route so no page loses microphone access", async () => {
    const groups = (await nextConfig.headers()) as { source: string }[];
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) expect(group.source).toBe("/(.*)");
  });

  it("Permissions-Policy allows microphone and camera for this origin", async () => {
    const headers = await securityHeaders();
    const policy = headers["permissions-policy"];
    expect(policy, "Permissions-Policy header must exist").toBeTruthy();

    const directives = parsePermissionsPolicy(policy);

    // The actual regression: `()` blocks the page's own getUserMedia calls.
    expect(directives.microphone, "microphone must be allowed for this page").toBe("(self)");
    expect(directives.camera, "camera must be allowed for this page").toBe("(self)");

    // Features no page feature uses stay fully denied (frames included).
    expect(directives.geolocation).toBe("()");
    expect(directives.payment).toBe("()");
    expect(directives.usb).toBe("()");
  });

  it("keeps the frame, MIME, referrer and isolation headers intact", async () => {
    const headers = await securityHeaders();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  });
});
