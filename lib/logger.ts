/**
 * Structured JSON logger for server-side observability. One JSON object per
 * line ingests cleanly into Vercel Logs / Datadog / Logtail.
 *
 * Contract: log event names and non-sensitive context only (ids, codes,
 * counts) — never tokens, secrets, cookies, or raw user content.
 */
type Level = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function emit(level: Level, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({ ts: new Date().toISOString(), level, event, ...context });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

export const logger = {
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context)
};
