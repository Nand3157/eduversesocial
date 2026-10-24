export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/** Redirect the retired full Flash model while keeping the distinct Flash-Lite model selectable. */
export function getGeminiModel(configured = process.env.GEMINI_MODEL) {
  if (!configured || configured === "gemini-3.5-flash") return DEFAULT_GEMINI_MODEL;
  return configured;
}

export function getGeminiDisplayName(model: string) {
  const known: Record<string, string> = {
    "gemini-3.8-flash": "Gemini 3.8 Flash",
    "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
    "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite"
  };
  return known[model] ?? model.replace(/^gemini-/, "Gemini ").replaceAll("-", " ");
}
