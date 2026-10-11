import { describe, expect, it } from "vitest";
import { hasInsightValues } from "@/lib/meta-insight-availability";

describe("hasInsightValues", () => {
  it("does not turn missing insight rows into a real zero", () => {
    expect(hasInsightValues([], ["page_views_total"])).toBe(false);
    expect(hasInsightValues([{ name: "page_views_total", values: [] }], ["page_views_total"])).toBe(false);
  });

  it("recognizes returned zero values as real data", () => {
    expect(hasInsightValues([{ name: "page_views_total", values: [{ value: 0 }] }], ["page_views_total"])).toBe(true);
  });
});
