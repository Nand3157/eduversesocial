#!/usr/bin/env node
/**
 * EduVerse CLI entry point. Zero runtime dependencies; uses global fetch
 * (Node >= 18). Agents can script interactions without building API clients.
 */
import { buildRequest, formatHealth, formatReviews, helpText, parseArgs, resolveBaseUrl, resolveCommand } from "./lib.mjs";

const { positional, flags } = parseArgs(process.argv.slice(2));

if (flags.help || positional.length === 0) {
  console.log(helpText());
  process.exit(0);
}

const command = resolveCommand(positional);
if (!command) {
  console.error(`Unknown command: ${positional.join(" ")}\n\n${helpText()}`);
  process.exit(1);
}

const request = buildRequest(command, resolveBaseUrl(flags), flags);

try {
  const response = await fetch(request.url, { method: request.method, headers: { Accept: request.accept } });
  const text = await response.text();
  if (!response.ok) {
    console.error(`Request failed (${response.status}): ${text.slice(0, 400)}`);
    process.exit(1);
  }
  if (flags.json || command.key === "openapi" || command.key === "tools") {
    console.log(text);
  } else if (command.key === "health") {
    console.log(formatHealth(JSON.parse(text)));
  } else if (command.key === "reviews:list") {
    console.log(formatReviews(JSON.parse(text)));
  } else if (command.key === "aiStatus") {
    const data = JSON.parse(text);
    console.log(`provider=${data.provider} model=${data.model}`);
  }
} catch (error) {
  console.error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
