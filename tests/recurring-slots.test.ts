import { describe, expect, it } from "vitest";
import { matchesRecurringSlot } from "@/lib/recurring-slots";

describe("recurring slot timezone matching", () => {
  it("matches the slot's local weekday and clock time, not the server timezone", () => {
    expect(matchesRecurringSlot("2026-10-05T16:00:00.000Z", { weekday: 1, local_time: "09:00:00", timezone: "America/Los_Angeles" })).toBe(true);
  });

  it("does not match a different local weekday or time", () => {
    const slot = { weekday: 1, local_time: "09:00:00", timezone: "America/Los_Angeles" };
    expect(matchesRecurringSlot("2026-10-05T17:00:00.000Z", slot)).toBe(false);
    expect(matchesRecurringSlot("2026-10-06T16:00:00.000Z", slot)).toBe(false);
  });

  it("fails closed for invalid timezones", () => {
    expect(matchesRecurringSlot("2026-10-05T16:00:00.000Z", { weekday: 1, local_time: "09:00:00", timezone: "Mars/Olympus" })).toBe(false);
  });
});
