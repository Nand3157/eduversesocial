import { describe, expect, it } from "vitest";
import { hasInsightValues } from "@/lib/meta-insight-availability";

describe("hasInsightValues", () => {
  it("does not turn missing insight rows into a real zero", () => {
    expect(hasInsightValues([], ["page_media_view"])).toBe(false);
    expect(hasInsightValues([{ name: "page_media_view", values: [] }], ["page_media_view"])).toBe(false);
  });

  it("recognizes returned zero values as real data", () => {
    expect(hasInsightValues([{ name: "page_media_view", values: [{ value: 0 }] }], ["page_media_view"])).toBe(true);
  });
});
