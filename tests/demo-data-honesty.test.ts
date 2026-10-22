import { describe, expect, it } from "vitest";
import { DEMO_SNAPSHOT } from "@/lib/demo-data";

/**
 * The demo is the one surface that shows invented numbers, so the fixture itself
 * must never claim a number is live and must never hand-write a value that
 * duplicates something computed elsewhere. These checks fail if the copy drifts
 * from the data again.
 */
describe("demo fixture honesty", () => {
  const posts = DEMO_SNAPSHOT.recentPosts;

  it("labels every sample post as simulated, never live", () => {
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.status === "Simulated")).toBe(true);
  });

  it("derives each visible date from its own timestamp", () => {
    for (const post of posts) {
      const expected = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      }).format(new Date(post.timestamp!));
      expect(post.date).toBe(expected);
    }
  });

  it("cites the top post date and the computed best window instead of hardcoding them", () => {
    const topWindow = DEMO_SNAPSHOT.bestTimes!.windows[0]!;
    expect(DEMO_SNAPSHOT.recommendations[0]![1]).toBe(`Based on ${posts[0]!.date}`);
    expect(DEMO_SNAPSHOT.recommendations[1]![0]).toContain(topWindow.label);
    expect(DEMO_SNAPSHOT.memoryItems.at(-1)).toContain(topWindow.label);
  });
});
