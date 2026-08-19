import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  platform: "facebook" | "instagram" | "threads";
  content: string;
  media: string[];
  account_id: string;
  attempts: number;
  status: string;
  scheduled_at: string;
  updated_at?: string;
  error?: string;
  external_post_id?: string | null;
  external_url?: string | null;
  account: { external_id: string; encrypted_token: string; token_expires_at?: string | null };
};

class FakeFrom {
  private ops: Array<[string, unknown[]]> = [];
  constructor(private table: string, private store: { rows: Row[]; attempts: Array<Record<string, unknown>> }) {}

  select(...args: unknown[]) { this.ops.push(["select", args]); return this; }
  eq(...args: unknown[]) { this.ops.push(["eq", args]); return this; }
  lte(...args: unknown[]) { this.ops.push(["lte", args]); return this; }
  lt(...args: unknown[]) { this.ops.push(["lt", args]); return this; }
  order(...args: unknown[]) { this.ops.push(["order", args]); return this; }
  limit(...args: unknown[]) { this.ops.push(["limit", args]); return this; }
  update(patch: Record<string, unknown>) { this.ops.push(["update", [patch]]); return this; }

  insert(row: Record<string, unknown>) {
    this.store.attempts.push(row);
    return Promise.resolve({ error: null });
  }

  then(resolve: (value: unknown) => unknown) {
    return this.resolve().then(resolve);
  }

  maybeSingle() {
    return this.resolveSingle();
  }

  private claim() {
    const patch = this.ops.find(([name]) => name === "update")?.[1][0] as Record<string, unknown> | undefined;
    const eqs = this.ops.filter(([name]) => name === "eq").map(([, args]) => args) as Array<[string, string]>;
    const id = eqs.find(([key]) => key === "id")?.[1];
    const fromStatus = eqs.find(([key]) => key === "status")?.[1];
    const row = this.store.rows.find((item) => item.id === id);
    if (!row || (fromStatus && row.status !== fromStatus)) return { data: null, error: null };
    Object.assign(row, patch);
    return { data: { id }, error: null };
  }

  private resolveSingle() {
    if (this.table === "scheduled_posts" && this.ops.some(([name]) => name === "update")) {
      return Promise.resolve(this.claim());
    }
    return Promise.resolve({ data: null, error: null });
  }

  private resolve() {
    if (this.table === "scheduled_posts" && this.ops.some(([name]) => name === "lte")) {
      const lteOp = this.ops.find(([name]) => name === "lte")!;
      const iso = (lteOp[1] as [string, string])[1];
      const cutoff = new Date(iso).getTime();
      const rows = this.store.rows
        .filter((row) => row.status === "SCHEDULED" && new Date(row.scheduled_at).getTime() <= cutoff)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .map((row) => ({ id: row.id, platform: row.platform, content: row.content, media: row.media, account_id: row.account_id, attempts: row.attempts, social_accounts: [row.account] }));
      return Promise.resolve({ data: rows, error: null });
    }
    if (this.table === "scheduled_posts" && this.ops.some(([name]) => name === "select") && !this.ops.some(([name]) => name === "lte")) {
      const statusEq = (this.ops.filter(([name]) => name === "eq").map(([, args]) => args) as Array<[string, string]>).find(([key]) => key === "status")?.[1];
      if (statusEq === "PUBLISHING") {
        // Stale-claim recovery query: return stuck rows as { id, attempts }.
        return Promise.resolve({ data: this.store.rows.filter((row) => row.status === "PUBLISHING").map((row) => ({ id: row.id, attempts: row.attempts })), error: null });
      }
    }
    if (this.table === "scheduled_posts" && this.ops.some(([name]) => name === "update") && !this.ops.some(([name]) => name === "select")) {
      // Terminal update: apply patch to the row matched by eq("id").
      const patch = this.ops.find(([name]) => name === "update")![1][0] as Record<string, unknown>;
      const id = (this.ops.find(([name]) => name === "eq")![1] as [string, string])[1];
      const row = this.store.rows.find((item) => item.id === id);
      if (row) Object.assign(row, patch);
      return Promise.resolve({ error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
}

function installFakeSupabase(store: { rows: Row[]; attempts: Array<Record<string, unknown>> }) {
  vi.doMock("@/lib/crypto", () => ({ encrypt: (value: string) => `enc:${value}`, decrypt: (value: string) => `decrypted:${value}` }));
  return {
    auth: { getUser: async () => ({ data: { user: { id: "user_1" } }, error: null }) },
    from: (table: string) => new FakeFrom(table, store)
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

function fetchHandler(handler: (url: string, init?: RequestInit) => { status: number; body: unknown; headers?: Record<string, string> }) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body, headers } = handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  }));
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Store = { rows: Row[]; attempts: Array<Record<string, unknown>> };

const makeStore = (rows: Row[]): Store => ({ rows, attempts: [] });

const dueRow = (overrides: Partial<Row> = {}): Row => ({
  id: "post_1",
  platform: "facebook",
  content: "Hello",
  media: [],
  account_id: "acc_1",
  attempts: 0,
  status: "SCHEDULED",
  scheduled_at: new Date(Date.now() - 60_000).toISOString(),
  account: { external_id: "page_1", encrypted_token: "enc-token" },
  ...overrides
});

describe("processDueMetaPosts", () => {
  it("publishes a due post and records a PUBLISHED attempt", async () => {
    const store = makeStore([dueRow()]);
    fetchHandler((url) => {
      if (url.includes("/feed")) return { status: 200, body: { id: "fb_1" } };
      if (url.includes("fields=permalink_url")) return { status: 200, body: { permalink_url: "https://facebook.com/p/fb_1" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    const result = await processDueMetaPosts(supabase);
    expect(result.processed).toBe(1);
    expect(store.rows[0].status).toBe("PUBLISHED");
    expect(store.rows[0].external_post_id).toBe("fb_1");
    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0].status).toBe("PUBLISHED");
  });

  it("retries transient failures with exponential backoff and a RETRY attempt log", async () => {
    const store = makeStore([dueRow()]);
    fetchHandler(() => ({ status: 429, body: { error: { code: 4, message: "rate limit" } }, headers: { "retry-after": "3" } }));
    const before = Date.now();
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    const result = await processDueMetaPosts(supabase);
    expect(result.processed).toBe(0);
    expect(store.rows[0].status).toBe("SCHEDULED");
    expect(store.rows[0].attempts).toBe(1);
    expect(new Date(store.rows[0].scheduled_at).getTime()).toBeGreaterThan(before + 60_000);
    expect(store.attempts[0].status).toBe("RETRY");
    expect(store.attempts[0].error_code).toBe("META_RATE_LIMIT");
  });

  it("marks posts FAILED after max attempts", async () => {
    const store = makeStore([dueRow({ attempts: 4 })]);
    installFakeSupabase(store);
    fetchHandler(() => ({ status: 500, body: { error: { code: 1, message: "boom" } } }));
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    await processDueMetaPosts(supabase);
    expect(store.rows[0].status).toBe("FAILED");
    expect(store.attempts[0].status).toBe("FAILED");
  });

  it("never publishes the same post twice: second run skips claimed posts", async () => {
    const store = makeStore([dueRow()]);
    installFakeSupabase(store);
    let published = 0;
    fetchHandler((url) => {
      if (url.includes("/feed")) { published++; return { status: 200, body: { id: `fb_${published}` } }; }
      if (url.includes("fields=permalink_url")) return { status: 200, body: { permalink_url: "https://facebook.com/p/x" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    await processDueMetaPosts(supabase);
    await processDueMetaPosts(supabase);
    expect(published).toBe(1);
    expect(store.rows[0].status).toBe("PUBLISHED");
  });

  it("requeues a post stuck in PUBLISHING from a crashed worker", async () => {
    const store = makeStore([
      dueRow({
        status: "PUBLISHING",
        scheduled_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60_000).toISOString()
      })
    ]);
    installFakeSupabase(store);
    fetchHandler(() => ({ status: 404, body: {} }));
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    await processDueMetaPosts(supabase);
    expect(store.rows[0].status).toBe("SCHEDULED");
    expect(store.rows[0].attempts).toBe(0);
  });

  it("fails a stuck PUBLISHING post whose retry budget is exhausted", async () => {
    const store = makeStore([
      dueRow({
        status: "PUBLISHING",
        attempts: 4,
        scheduled_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60_000).toISOString()
      })
    ]);
    installFakeSupabase(store);
    fetchHandler(() => ({ status: 404, body: {} }));
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    await processDueMetaPosts(supabase);
    expect(store.rows[0].status).toBe("FAILED");
    expect(store.rows[0].error).toContain("retry budget");
  });

  it("publishes multiple due posts concurrently without double-claiming", async () => {
    const store = makeStore([
      dueRow({ id: "post_1" }),
      dueRow({ id: "post_2" }),
      dueRow({ id: "post_3" }),
      dueRow({ id: "post_4" })
    ]);
    let feedCalls = 0;
    fetchHandler((url) => {
      if (url.includes("/feed")) { feedCalls++; return { status: 200, body: { id: `fb_${feedCalls}` } }; }
      if (url.includes("fields=permalink_url")) return { status: 200, body: { permalink_url: "https://facebook.com/p/x" } };
      throw new Error(`Unexpected URL ${url}`);
    });
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    const result = await processDueMetaPosts(supabase);
    expect(result.processed).toBe(4);
    expect(store.rows.every((row) => row.status === "PUBLISHED")).toBe(true);
    expect(store.attempts).toHaveLength(4);
    expect(feedCalls).toBe(4);
  });

  it("does not publish posts whose token has expired", async () => {
    const store = makeStore([dueRow({ account: { external_id: "page_1", encrypted_token: "enc-token", token_expires_at: new Date(Date.now() - 1000).toISOString() } })]);
    installFakeSupabase(store);
    let called = false;
    fetchHandler(() => { called = true; return { status: 200, body: { id: "x" } }; });
    const supabase = installFakeSupabase(store);
    const { processDueMetaPosts } = await import("@/lib/meta-scheduler");
    await processDueMetaPosts(supabase);
    expect(called).toBe(false);
    expect(store.rows[0].status).toBe("FAILED");
    expect(store.attempts[0].error_code).toBe("META_AUTH_ERROR");
  });
});
