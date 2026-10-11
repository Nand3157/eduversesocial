import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("preserves quoted commas, escaped quotes, and embedded newlines", () => {
    expect(parseCsv('platform,content,date\r\ninstagram,"A, “saved” post","Sep 1, 2026"\r\nthreads,"Line one\nLine two",Sep 2'))
      .toEqual([
        ["platform", "content", "date"],
        ["instagram", "A, “saved” post", "Sep 1, 2026"],
        ["threads", "Line one\nLine two", "Sep 2"]
      ]);
  });

  it("decodes escaped quotes and rejects an unclosed quoted field", () => {
    expect(parseCsv('platform,content\ninstagram,"A ""quoted"" caption"'))
      .toEqual([["platform", "content"], ["instagram", 'A "quoted" caption']]);
    expect(() => parseCsv('platform,content\ninstagram,"unfinished')).toThrow("unclosed quoted field");
  });
});
