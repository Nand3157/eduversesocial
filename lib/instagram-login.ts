const LONG_LIVED_TOKEN_MS = 60 * 24 * 60 * 60 * 1000;
const REFRESH_WHEN_REMAINING_MS = 21 * 24 * 60 * 60 * 1000;

/** Refresh an unexpired Instagram Login token before Meta's 60-day expiry. */
export async function refreshInstagramLoginToken(token: string, expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const expiry = Date.parse(expiresAt);
  const now = Date.now();
  const remaining = expiry - now;
  // Meta only accepts refreshes after the token is 24 hours old and before it expires.
  if (!Number.isFinite(expiry) || remaining <= 0 || remaining > REFRESH_WHEN_REMAINING_MS || LONG_LIVED_TOKEN_MS - remaining < 24 * 60 * 60 * 1000) return null;

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  const data = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) return null;
  return {
    token: data.access_token,
    expiresAt: new Date(now + (data.expires_in ?? LONG_LIVED_TOKEN_MS / 1000) * 1000).toISOString()
  };
}
