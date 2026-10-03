/**
 * Pure text-preparation helpers shared by the server TTS pipeline and the
 * browser device-voice fallback. Deliberately dependency-free so client
 * components can import it without pulling @google/genai into the bundle.
 */

/** Read-aloud clips are single replies; 4k characters comfortably covers a long answer. */
export const SPEECH_MAX_CHARACTERS = 4_000;

export function clampSpeechText(text: string): string {
  return text.length <= SPEECH_MAX_CHARACTERS ? text : `${text.slice(0, SPEECH_MAX_CHARACTERS)}…`;
}

/**
 * Strip markdown formatting so the voice reads content, not syntax: code
 * spans/backtick fences, bold/italics, headings, bullets, links and table
 * pipes are dropped or flattened to plain spoken text.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, " (image) ")
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^---+$/gm, "")
    .replace(/\|/g, " ")
    // Paragraph breaks become sentence pauses — unless the line already ends
    // in sentence punctuation, which must not be doubled ("point..").
    .replace(/\n{2,}/g, (match: string, offset: number, input: string) =>
      /[.!?…]/.test(input[offset - 1] ?? "") ? " " : ". "
    )
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
