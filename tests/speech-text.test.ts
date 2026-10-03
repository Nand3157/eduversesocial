import { describe, expect, it } from "vitest";
import { clampSpeechText, SPEECH_MAX_CHARACTERS, stripMarkdownForSpeech } from "@/lib/speech/speech-text";

describe("stripMarkdownForSpeech", () => {
  it("removes headings, bullets and bold markers", () => {
    const input = "## Weekly recap\n- **Save rate** is up\n1. Post at 6pm";
    expect(stripMarkdownForSpeech(input)).toBe("Weekly recap Save rate is up Post at 6pm");
  });

  it("flattens links to their label and marks images", () => {
    expect(stripMarkdownForSpeech("See [the dashboard](https://example.com) now")).toBe("See the dashboard now");
    expect(stripMarkdownForSpeech("![chart](https://example.com/chart.png) attached")).toBe("(image) attached");
  });

  it("replaces code fences with a spoken placeholder and unwraps inline code", () => {
    expect(stripMarkdownForSpeech("Use ```js\nconsole.log(1)\n``` today")).toContain("(code block)");
    expect(stripMarkdownForSpeech("Set `save_rate` to 1")).toBe("Set save_rate to 1");
  });

  it("turns paragraph breaks into sentence pauses without doubling punctuation", () => {
    expect(stripMarkdownForSpeech("First point.\n\nSecond point.\n- third")).toBe(
      "First point. Second point. third"
    );
    expect(stripMarkdownForSpeech("First point\n\nSecond point")).toBe("First point. Second point");
  });

  it("drops blockquote markers and horizontal rules", () => {
    expect(stripMarkdownForSpeech("> quoted thought\n---\nafter")).toBe("quoted thought. after");
  });
});

describe("clampSpeechText", () => {
  it("leaves short text untouched", () => {
    expect(clampSpeechText("hello")).toBe("hello");
  });

  it("truncates long text with an ellipsis at the cap", () => {
    const long = "a".repeat(SPEECH_MAX_CHARACTERS + 10);
    const clamped = clampSpeechText(long);
    expect(clamped.length).toBe(SPEECH_MAX_CHARACTERS + 1); // + ellipsis char
    expect(clamped.endsWith("…")).toBe(true);
  });
});
