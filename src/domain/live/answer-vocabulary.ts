export const AFFIRMATIONS: ReadonlySet<string> = new Set([
  "yes",
  "yeah",
  "yep",
  "yup",
  "yea",
  "correct",
  "right",
  "confirmed",
  "confirm",
  "affirmative",
  "exactly",
  "absolutely",
  "indeed",
])

export const NEGATIONS: ReadonlySet<string> = new Set([
  "no",
  "nope",
  "nah",
  "not",
  "wrong",
  "incorrect",
  "negative",
  "isnt",
  "wasnt",
  "dont",
  "doesnt",
  "never",
])

export const CORRECTIONS: ReadonlySet<string> = new Set([
  "but",
  "actually",
  "instead",
  "rather",
  "sorry",
  "wait",
  "change",
  "correction",
  "meant",
  "except",
  "however",
  "scratch",
])

export const BACKCHANNELS: ReadonlySet<string> = new Set([
  "mhm",
  "uhhuh",
  "okay",
  "ok",
  "thankyou",
  "thanks",
  "hmm",
  "hm",
  "um",
  "uh",
  "er",
  "alright",
])

export const FILLERS: ReadonlySet<string> = new Set([
  "thats",
  "that",
  "is",
  "it",
  "its",
  "the",
  "a",
  "an",
  "of",
  "per",
  "and",
  "please",
  "so",
  "i",
])

const PHRASES: readonly (readonly [RegExp, string])[] = [
  [/\bthank\s+you\b/g, "thankyou"],
  [/\buh[\s-]*huh\b/g, "uhhuh"],
  [/\b(mm[\s-]*hmm|mmhmm|mhmm|mhm)\b/g, "mhm"],
  [/\ball\s+right\b/g, "alright"],
]

const CURLY_APOSTROPHES = new RegExp(`[${String.fromCharCode(0x2018, 0x2019)}]`, "g")

export function replyWords(text: string): readonly string[] {
  let lowered = text.toLowerCase().replace(CURLY_APOSTROPHES, "'")
  for (const [pattern, replacement] of PHRASES) {
    lowered = lowered.replace(pattern, replacement)
  }
  return lowered
    .replace(/'/g, "")
    .replace(/[^a-z0-9%\s]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0)
}
