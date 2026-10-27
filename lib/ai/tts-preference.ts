export const TTS_PREFERENCE_STORAGE_KEY = "eduverse:tts-presentation";

export const TTS_PRESENTATIONS = ["female", "male"] as const;
export type TtsPresentation = (typeof TTS_PRESENTATIONS)[number];

export const DEFAULT_TTS_PRESENTATION: TtsPresentation = "female";

// Stable Gemini prebuilt voices: Kore for the female presentation and Puck for
// the male presentation. The same mapping is used by manual and automatic TTS.
export const TTS_VOICE_BY_PRESENTATION: Record<TtsPresentation, string> = {
  female: "Kore",
  male: "Puck"
};

export function isTtsPresentation(value: unknown): value is TtsPresentation {
  return value === "female" || value === "male";
}
