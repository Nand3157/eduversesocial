import { describe, expect, it } from "vitest";
import { validateMedia } from "@/app/api/meta/publish/route";

const base = { caption: "Hello", targetAccountId: "acc_1" };

describe("validateMedia", () => {
  it("rejects Instagram posts without media", () => {
    expect(validateMedia({ ...base, platform: "instagram", mediaType: "TEXT" })).toMatch(/Instagram publishing requires/);
    expect(validateMedia({ ...base, platform: "instagram", mediaType: "IMAGE" })).toMatch(/Instagram publishing requires/);
  });

  it("accepts Instagram posts with media", () => {
    expect(validateMedia({ ...base, platform: "instagram", mediaType: "IMAGE", mediaUrls: ["https://cdn.example.com/a.jpg"] })).toBeNull();
  });

  it("rejects media-type posts without media and text posts with media", () => {
    expect(validateMedia({ ...base, platform: "facebook", mediaType: "VIDEO" })).toMatch(/require at least one media URL/);
    expect(validateMedia({ ...base, platform: "threads", mediaType: "TEXT", mediaUrls: ["https://cdn.example.com/a.jpg"] })).toMatch(/cannot include media/);
  });

  it("accepts plain text posts", () => {
    expect(validateMedia({ ...base, platform: "threads", mediaType: "TEXT" })).toBeNull();
    expect(validateMedia({ ...base, platform: "facebook", mediaType: "TEXT" })).toBeNull();
  });
});
