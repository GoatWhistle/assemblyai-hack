export type PublicDocument = "README.md" | "src/features/deck/slides.ts" | `docs/${string}.md`

export const PUBLIC_DOCUMENTS: readonly PublicDocument[] = [
  "README.md",
  "src/features/deck/slides.ts",
]

export type Anchor = {
  readonly document: PublicDocument
  readonly locate: RegExp
  readonly source: string
  readonly reproduce: (evidence: string) => string
}

export type Cited = {
  readonly document: PublicDocument
  readonly figure: string
  readonly reason: string
}

export const VITEST_LIST = "npx vitest list --json"

export function capture(evidence: string, pattern: RegExp): readonly string[] {
  const found = evidence.match(pattern)
  if (found === null) {
    throw new Error(`the evidence no longer matches ${pattern}; the source changed its output`)
  }
  return found.slice(1).map((group) => group ?? "")
}

export function integer(evidence: string, pattern: RegExp, index = 0): number {
  const value = Number(capture(evidence, pattern)[index])
  if (!Number.isInteger(value)) {
    throw new Error(`group ${index} of ${pattern} is not an integer`)
  }
  return value
}

export function percent(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`
}

export function grouped(value: number, separator: string): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

const WORDS: readonly string[] = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
]

export function spelled(value: number): string {
  return WORDS[value] ?? String(value)
}

export function capitalised(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function figuresLocated(text: string, locate: RegExp): readonly string[] {
  const flags = locate.flags.includes("g") ? locate.flags : `${locate.flags}g`
  return [...text.matchAll(new RegExp(locate.source, flags))].map((found) =>
    found
      .slice(1)
      .filter((group) => group !== undefined)
      .join(" | "),
  )
}
