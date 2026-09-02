import type { RateLimitResult } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

export type ApiProblem = {
  type: string;
  title: string;
  status: number;
  code: string;
  message: string;
  resolution: string;
  requestId?: string;
};

/** RFC 9457-style JSON errors with a stable code and a useful next step. */
export function problemResponse(
  status: number,
  code: string,
  message: string,
  resolution: string,
  request?: Request
) {
  const requestId = request?.headers.get("x-request-id")?.slice(0, 128);
  const body: ApiProblem = {
    type: `${SITE_URL}/problems/${code.toLowerCase()}`,
    title: status >= 500 ? "Request failed" : "Request could not be completed",
    status,
    code,
    message,
    resolution,
    ...(requestId ? { requestId } : {})
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/** Add RFC 9333 rate-limit headers to both success and error responses. */
export function withRateLimitHeaders<T extends Response>(response: T, limit: number, result: RateLimitResult): T {
  const reset = Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000));
  response.headers.set("RateLimit-Limit", String(limit));
  response.headers.set("RateLimit-Remaining", String(result.remaining));
  response.headers.set("RateLimit-Reset", String(reset));
  if (response.status === 429) response.headers.set("Retry-After", String(reset));
  return response;
}

export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${prefix}:${realIp || forwarded || "anonymous"}`;
}
