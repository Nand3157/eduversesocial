import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertRows: Array<Record<string, unknown>> = [];
let stateCookie: string | null = null;
const cookieOps: unknown[][] = [];

function fakeSupabase() {
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "upsert") return (row: Record<string, unknown>) => {
        upsertRows.push(row);
        const single = () => Promise.resolve({ data: { id: "row_id" }, error: null });
        const withSelect = new Proxy({}, {
          get(_t, p: string) {
            if (p === "then") return undefined;
            if (p === "select") return () => new Proxy({}, { get: (_s, sp: string) => (sp === "then" ? undefined : sp === "single" ? single : () => undefined) });
            return undefined;
          }
        });
        return withSelect;
      };
      if (prop === "maybeSingle") return () => Promise.resolve({ data: { workspace_id: "ws_1" }, error: null });
      return (..._args: unknown[]) => {
        chain[prop] = _args;
        return proxy;
      };
    }
  };
  const proxy = new Proxy({}, handler);
  return {
    auth: { getUser: async () => ({ data: { user: { id: "user_1" } }, error: null }) },
    from: () => proxy
  };
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (stateCookie !== null ? { value: stateCookie } : undefined),
    set: (...args: unknown[]) => { cookieOps.push(["set", ...args]); },
    delete: (...args: unknown[]) => { cookieOps.push(["delete", ...args]); }
  })
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeSupabase() }));
vi.mock("@/lib/crypto", () => ({ encrypt: (value: string) => `enc:${value}`, decrypt: (value: string) => value.replace(/^enc:/, "") }));

beforeEach(() => {
  upsertRows.length = 0;
  stateCookie = "valid-state";
  cookieOps.length = 0;
  vi.stubEnv("META_APP_ID", "meta-app");
  vi.stubEnv("META_APP_SECRET", "meta-secret");
  vi.stubEnv("META_GRAPH_VERSION", "v26.0");
  vi.stubEnv("META_REDIRECT_URI", "https://example.com/api/meta/oauth/callback");
  vi.stubEnv("THREADS_APP_ID", "threads-app");
  vi.stubEnv("THREADS_APP_SECRET", "threads-secret");
  vi.stubEnv("THREADS_REDIRECT_URI", "https://example.com/api/meta/threads/callback");
  vi.stubEnv("ENCRYPTION_KEY", "test-encryption-key-32bytes-minimum");
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function installFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown; headers?: Record<string, string> }) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body, headers } = handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  }));
}

function locationOf(response: Response) {
  return response.headers.get("location");
}

describe("Facebook OAuth callback", () => {
  it("exchanges the code, discovers pages and redirects to connected", async () => {
    installFetch((url) => {
      if (url.includes("oauth/access_token")) return { status: 200, body: { access_token: "short-token", expires_in: 5000 } };
      if (url.includes("me/accounts")) {
        return { status: 200, body: { data: [{ id: "page_1", name: "Page", access_token: "page-token", instagram_business_account: { id: "ig_1", username: "ig.user" } }] } };
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const { GET } = await import("@/app/api/meta/oauth/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/oauth/callback?state=valid-state&code=abc123"));
    expect(locationOf(response)).toContain("meta=connected");
    expect(upsertRows).toHaveLength(2);
    expect(upsertRows[0].platform).toBe("facebook");
    expect(upsertRows[1].platform).toBe("instagram");
    expect(upsertRows[1].external_id).toBe("ig_1");
    expect(String(upsertRows[1].encrypted_token)).toContain("enc:");
  });

  it("rejects a mismatched state", async () => {
    const { GET } = await import("@/app/api/meta/oauth/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/oauth/callback?state=attacker-state&code=abc"));
    expect(locationOf(response)).toContain("meta=state_invalid");
    expect(upsertRows).toHaveLength(0);
  });

  it("rejects a missing state cookie", async () => {
    stateCookie = null;
    const { GET } = await import("@/app/api/meta/oauth/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/oauth/callback?state=valid-state&code=abc"));
    expect(locationOf(response)).toContain("meta=state_invalid");
  });

  it("redirects to denied when the user declines", async () => {
    const { GET } = await import("@/app/api/meta/oauth/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/oauth/callback?state=valid-state&error=access_denied&error_description=User+declined"));
    expect(locationOf(response)).toContain("meta=denied");
  });

  it("redirects to code_invalid when token exchange fails", async () => {
    installFetch(() => ({ status: 400, body: { error: { message: "Invalid code" } } }));
    const { GET } = await import("@/app/api/meta/oauth/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/oauth/callback?state=valid-state&code=bad"));
    expect(locationOf(response)).toContain("meta=code_invalid");
  });
});

describe("Threads OAuth callback", () => {
  it("exchanges code, upgrades to a long-lived token and redirects to connected", async () => {
    installFetch((url, init) => {
      if (url.includes("graph.threads.net/oauth/access_token") && String(init?.method ?? "") === "POST") {
        return { status: 200, body: { access_token: "short", user_id: "threads_1" } };
      }
      if (url.includes("grant_type=th_exchange_token")) return { status: 200, body: { access_token: "long-lived" } };
      if (url.includes("me?fields=id,username,name")) return { status: 200, body: { id: "threads_1", username: "threader" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const { GET } = await import("@/app/api/meta/threads/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/threads/callback?state=valid-state&code=abc"));
    expect(locationOf(response)).toContain("threads=connected");
    expect(upsertRows).toHaveLength(1);
    expect(upsertRows[0].platform).toBe("threads");
    expect(String(upsertRows[0].encrypted_token)).toContain("enc:long-lived");
    expect(upsertRows[0].token_expires_at).toBeDefined();
  });

  it("rejects a mismatched state", async () => {
    const { GET } = await import("@/app/api/meta/threads/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/threads/callback?state=bad&code=abc"));
    expect(locationOf(response)).toContain("threads=state_invalid");
  });

  it("redirects to denied when the user declines", async () => {
    const { GET } = await import("@/app/api/meta/threads/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/threads/callback?state=valid-state&error=access_denied"));
    expect(locationOf(response)).toContain("threads=denied");
  });

  it("redirects to code_invalid when token exchange fails", async () => {
    installFetch(() => ({ status: 400, body: { error: { message: "bad code" } } }));
    const { GET } = await import("@/app/api/meta/threads/callback/route");
    const response = await GET(new Request("https://example.com/api/meta/threads/callback?state=valid-state&code=bad"));
    expect(locationOf(response)).toContain("threads=code_invalid");
  });
});
