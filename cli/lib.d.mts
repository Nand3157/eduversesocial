/** Type declarations for the dependency-free CLI helpers (cli/lib.mjs). */
export declare const BASE_URL_ENV: string;
export declare const DEFAULT_BASE_URL: string;

export interface CommandSpec {
  description: string;
  usage: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
}

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, boolean | string | undefined>;
}

export declare const COMMANDS: Record<string, CommandSpec & { key?: string }>;

export declare function parseArgs(argv: string[]): ParsedArgs;

export declare function resolveCommand(
  positional: string[]
): ({ key: string } & CommandSpec) | undefined | null;

export declare function resolveBaseUrl(flags: Record<string, unknown>, env?: Record<string, string | undefined>): string;

export declare function buildRequest(
  commandSpec: { key: string; path: string; method: CommandSpec["method"] },
  baseUrl: string,
  flags?: Record<string, boolean | string | undefined>
): { url: string; method: CommandSpec["method"]; accept: string };

export declare function formatHealth(payload: { status: string; timestamp: string }): string;

export declare function formatReviews(payload: {
  reviews: Array<{ name: string; role: string | null; rating: number; content: string }>;
}): string;

export declare function helpText(): string;
