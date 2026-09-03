import { describe, expect, it } from "vitest";
import { snapshotExportRows } from "@/lib/report-export";
import { DEMO_SNAPSHOT } from "@/lib/demo-data";

describe("report export rows", () => {
  it("keeps metrics, posts, memory, and recommendations in one export", () => {
    const rows = snapshotExportRows(DEMO_SNAPSHOT);
    const sections = new Set(rows.map((row) => row.section));

    expect(sections).toEqual(new Set(["metric", "platform", "posting", "audience", "engagement", "sentiment", "post", "memory", "recommendation"]));
    expect(rows.find((row) => row.section === "post")?.reach).toBe("28.4K");
    expect(rows.find((row) => row.section === "recommendation")?.status).toBe("Based on Aug 7");
  });
});
