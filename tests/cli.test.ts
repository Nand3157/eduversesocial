import { describe, expect, it } from "vitest";
import {
  COMMANDS,
  buildRequest,
  formatHealth,
  formatReviews,
  helpText,
  parseArgs,
  resolveBaseUrl,
  resolveCommand
} from "../cli/lib.mjs";

describe("EduVerse CLI (#11)", () => {
  it("parses flags and positional arguments", () => {
    const { positional, flags } = parseArgs(["reviews", "list", "--site", "https://x.example", "--json"]);
    expect(positional).toEqual(["reviews", "list"]);
    expect(flags.site).toBe("https://x.example");
    expect(flags.json).toBe(true);
  });

  it("resolves simple and grouped commands", () => {
    expect(resolveCommand(["health"])?.path).toBe("/api/health");
    expect(resolveCommand(["reviews", "list"])?.key).toBe("reviews:list");
    expect(resolveCommand(["nope"])).toBeUndefined();
    expect(resolveCommand([])).toBeNull();
  });

  it("builds requests against the resolved base URL and honors --yaml", () => {
    const openapi = resolveCommand(["openapi"])!;
    expect(buildRequest(openapi, "https://eduverse.example/", {}).url).toBe("https://eduverse.example/openapi.json");
    expect(buildRequest(openapi, "https://eduverse.example", { yaml: true })).toMatchObject({
      url: "https://eduverse.example/api/openapi.yaml",
      accept: "application/yaml"
    });
    const health = resolveCommand(["health"])!;
    expect(buildRequest(health, "https://eduverse.example")).toMatchObject({ method: "GET", url: "https://eduverse.example/api/health" });
  });

  it("resolves the base URL from flags then environment with trailing-slash trimming", () => {
    expect(resolveBaseUrl({ site: "https://a.example///" }, {})).toBe("https://a.example");
    expect(resolveBaseUrl({}, { EDUVERSE_URL: "https://b.example/" })).toBe("https://b.example");
    expect(String(resolveBaseUrl({}, {}))).toBeTruthy();
    expect(Object.keys(COMMANDS)).toContain("health");
  });

  it("formats health payloads and review lists for humans", () => {
    expect(formatHealth({ status: "ok", timestamp: "2026-08-23T00:00:00.000Z" })).toContain("status=ok");
    const output = formatReviews({
      reviews: [
        { name: "Ada", role: "CTO", rating: 5, content: "Great" },
        { name: "Bo", role: null, rating: 3, content: "Fine" }
      ]
    });
    expect(output.split("\n")[0]).toBe("***** Ada (CTO): Great");
    expect(output.split("\n")[1]).toBe("*** Bo: Fine");
    expect(formatReviews({ reviews: [] })).toContain("No approved reviews yet.");
  });

  it("renders help covering every command", () => {
    const help = helpText();
    for (const name of Object.keys(COMMANDS)) expect(help).toContain(name);
    expect(help).toContain("--site <url>");
  });
});
