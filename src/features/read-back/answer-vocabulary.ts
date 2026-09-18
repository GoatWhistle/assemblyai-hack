export const CONFIRMING: readonly string[] = Object.freeze([
  "yes",
  "yeah",
  "correct",
  "that's right",
  "thats right",
  "confirmed",
  "right",
])

export const DENYING: readonly string[] = Object.freeze([
  "no",
  "nope",
  "wrong",
  "not quite",
  "negative",
])

export const CANCELLING: readonly string[] = Object.freeze([
  "cancel",
  "cancel that",
  "stop",
  "abort",
  "start over",
  "scratch that",
])

const ANSWER_PUNCTUATION = /[.!?,]/g

export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(ANSWER_PUNCTUATION, "")
}

export function leadsWith(normalized: string, vocabulary: readonly string[]): boolean {
  return vocabulary.some((entry) => normalized === entry || normalized.startsWith(`${entry} `))
}
