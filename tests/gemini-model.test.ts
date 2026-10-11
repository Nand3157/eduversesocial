import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODEL, getGeminiDisplayName, getGeminiModel } from "@/lib/ai/model";

describe("Gemini model selection", () => {
  it("uses Gemini 3.8 Flash by default and for the deprecated 3.5 Flash alias", () => {
    expect(getGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(getGeminiModel("gemini-3.5-flash")).toBe(DEFAULT_GEMINI_MODEL);
  });

  it("preserves configured alternatives and reports the active model name", () => {
    expect(getGeminiModel("gemini-3.5-flash-lite")).toBe("gemini-3.5-flash-lite");
    expect(getGeminiDisplayName(DEFAULT_GEMINI_MODEL)).toBe("Gemini 3.8 Flash");
  });
});
