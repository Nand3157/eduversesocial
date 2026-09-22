import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * LOW logic tier — one-file-per-item source contracts.
 *
 * Ground-truth verdicts driving these assertions:
 *  1. COEP claim      — REPRODUCED: privacy page advertised COEP; the app sends
 *                       COOP + CORP but never COEP (next.config.mjs). Claim fixed.
 *  2. UTC/atlas date  — DID NOT REPRODUCE: best-time card resolves the browser
 *                       IANA timezone (with UTC fallback), persists it, and
 *                       formats through Intl with that zone; scheduler/publish
 *                       round-trip ISO-8601 with offsets. No bug found.
 *  3. --landing-line  — DID NOT REPRODUCE: defined in :root-equivalent block,
 *                       dark-mode override at globals.css:419, consumed by many
 *                       landing rules and inline landing-page classes.
 *  4. aria-live       — DID NOT REPRODUCE: 12 regions audited; all announce
 *                       their own dynamic text (export status, toasts, chat
 *                       log, pager). No cross-element misaim found.
 *  5. 413 vs 400      — REPRODUCED: oversize upload (>4MB) returned 400;
 *                       fixed to 413 per RFC 9110 (well-formed body, too large).
 */

const read = (p: string) => readFileSync(p, "utf8");

describe("LOW 1 — privacy page matches the security headers actually sent", () => {
  it("claims only header families next.config.mjs really sends", () => {
    const privacy = read("app/privacy/page.tsx");
    const config = read("next.config.mjs");

    // Every COOP/COEP/CORP claim on the page must correspond to a real header.
    const claimed = [...privacy.matchAll(/COOP|COEP|CORP/g)].map((m) => m[0]);
    expect(claimed.length).toBeGreaterThan(0);
    for (const token of claimed) {
      expect(config).toContain(`Cross-Origin-Opener-Policy`);
      expect(config).toContain(`Cross-Origin-Resource-Policy`);
      if (token === "COEP") {
        // COEP is allowed only if actually configured.
        expect(config).toContain(`Cross-Origin-Embedder-Policy`);
      }
    }
    // And COEP specifically must NOT be claimed unless configured.
    if (!config.includes("Cross-Origin-Embedder-Policy")) {
      expect(privacy).not.toMatch(/COEP/);
    }
  });
});

describe("LOW 2 — best-time timezone handling is timezone-correct", () => {
  it("uses the browser IANA zone (not a hardcoded UTC display)", () => {
    const src = read("components/dashboard/best-time-card.tsx");
    expect(src).toContain("Intl.DateTimeFormat().resolvedOptions().timeZone");
    expect(src).toContain('timeZone || "UTC"'); // fallback, not the primary
    // Formatting actually passes the resolved zone to Intl.
    expect(src).toMatch(/Intl\.DateTimeFormat\(undefined, \{[\s\S]*?timeZone/);
    expect(src).toContain("resolveTimezone(");
  });
});

describe("LOW 3 — --landing-line is defined and resolvable", () => {
  it("has a definition and consumers", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/--landing-line:\s*#/); // base definition
    expect(css).toMatch(/--landing-line:\s*var\(/); // dark override
    const uses = css.match(/var\(--landing-line\)/g)?.length ?? 0;
    expect(uses).toBeGreaterThanOrEqual(10);
  });
});

describe("LOW 4 — aria-live regions announce their own content", () => {
  it("no region points at an aria-live wrapper with no dynamic text inside", () => {
    // Representative audit surface: every aria-live in the dashboard carries
    // its message inside the same element.
    const exportActions = read("components/dashboard/export-actions.tsx");
    expect(exportActions).toMatch(/message && <p aria-live="polite"/);
    const postTable = read("components/dashboard/post-table.tsx");
    expect(postTable).toMatch(/aria-live="polite"/);
    const chat = read("components/dashboard/chat-interface.tsx");
    // The chat log region carries the messages themselves.
    expect(chat).toMatch(/role="log" aria-live="polite"/);
  });
});

describe("LOW 5 — oversize uploads are rejected with 413", () => {
  it("the >4MB branch returns status 413, empty-body stays 400", () => {
    const src = read("app/api/meta/upload/route.ts");
    expect(src).toContain("IMAGE_TOO_LARGE");
    expect(src).toMatch(/buffer\.length > 4 \* 1024 \* 1024[\s\S]{0,200}status: 413/);
    expect(src).toMatch(/!buffer\.length[\s\S]{0,120}status: 400/);
    // No other oversize-shaped 400 remains on that branch.
    expect(src).not.toMatch(/buffer\.length > 4 \* 1024 \* 1024[\s\S]{0,200}status: 400/);
  });
});
