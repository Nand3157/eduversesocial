/**
 * Pure helpers for the EduVerse CLI. Kept dependency-free and side-effect
 * free so tests can exercise them directly.
 */

export const BASE_URL_ENV = "EDUVERSE_URL";
export const DEFAULT_BASE_URL = "https://eduverse.app";

export const COMMANDS = {
  health: { description: "Check service health.", usage: "eduverse health [--site <url>]", method: "GET", path: "/api/health" },
  aiStatus: { description: "Show the AI provider/model powering chat.", usage: "eduverse ai-status [--site <url>]", method: "GET", path: "/api/ai/status" },
  "reviews:list": { description: "List approved customer reviews.", usage: "eduverse reviews list [--site <url>]", method: "GET", path: "/api/reviews" },
  openapi: { description: "Print the OpenAPI specification.", usage: "eduverse openapi [--site <url>] [--yaml]", method: "GET", path: "/openapi.json" },
  tools: { description: "Print LLM function-calling tool definitions.", usage: "eduverse tools [--site <url>]", method: "GET", path: "/api/tools.json" }
};

export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--site" || token === "-s") {
      flags.site = argv[++i];
    } else if (token === "--yaml") {
      flags.yaml = true;
    } else if (token === "--help" || token === "-h") {
      flags.help = true;
    } else if (token === "--json") {
      flags.json = true;
    } else if (!token.startsWith("-")) {
      positional.push(token);
    }
  }
  return { positional, flags };
}

/** Resolve the command triple ("reviews list" -> reviews:list) to a spec. */
export function resolveCommand(positional) {
  if (positional.length === 0) return null;
  const joined = positional.length > 1 ? `${positional[0]}:${positional.slice(1).join(":")}` : positional[0];
  if (COMMANDS[joined]) return { key: joined, ...COMMANDS[joined] };
  // "reviews list" style with nested groups.
  const groupKey = `${positional[0]}:${positional[1] ?? ""}`;
  if (COMMANDS[groupKey]) return { key: groupKey, ...COMMANDS[groupKey] };
  return undefined;
}

export function resolveBaseUrl(flags, env = process.env) {
  const raw = flags.site || env[BASE_URL_ENV] || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function buildRequest(commandSpec, baseUrl, flags = {}) {
  let path = commandSpec.path;
  if (commandSpec.key === "openapi" && flags.yaml) path = "/api/openapi.yaml";
  return {
    url: `${baseUrl.replace(/\/+$/, "")}${path}`,
    method: commandSpec.method,
    accept: commandSpec.key === "openapi" && flags.yaml ? "application/yaml" : "application/json"
  };
}

export function formatHealth(payload) {
  return `status=${payload.status} timestamp=${payload.timestamp}`;
}

export function formatReviews(payload) {
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  if (reviews.length === 0) return "No approved reviews yet.";
  return reviews.map((review) => `${"*".repeat(review.rating)} ${review.name}${review.role ? ` (${review.role})` : ""}: ${review.content}`).join("\n");
}

export function helpText() {
  const lines = Object.entries(COMMANDS).map(([name, spec]) => `  ${name.padEnd(14)} ${spec.description}\n      ${spec.usage}`);
  return [`Usage: eduverse <command> [options]`, "", "Commands:", ...lines, "", "Options:", "  --site <url>   Deployment base URL (or set EDUVERSE_URL).", "  --yaml         With 'openapi': emit YAML instead of JSON.", "  --json         Print raw JSON where applicable.", "  -h, --help     Show this help."].join("\n");
}
