import type { FieldPolicy, SpellOutStyle } from "@/domain"

export const NATO: Readonly<Record<string, string>> = Object.freeze({
  a: "Alfa",
  b: "Bravo",
  c: "Charlie",
  d: "Delta",
  e: "Echo",
  f: "Foxtrot",
  g: "Golf",
  h: "Hotel",
  i: "India",
  j: "Juliett",
  k: "Kilo",
  l: "Lima",
  m: "Mike",
  n: "November",
  o: "Oscar",
  p: "Papa",
  q: "Quebec",
  r: "Romeo",
  s: "Sierra",
  t: "Tango",
  u: "Uniform",
  v: "Victor",
  w: "Whiskey",
  x: "Xray",
  y: "Yankee",
  z: "Zulu",
})

export const DIGIT_WORDS: Readonly<Record<string, string>> = Object.freeze({
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
})

export function digitWord(character: string): string {
  return DIGIT_WORDS[character] ?? character
}

export function natoWord(character: string): string {
  return NATO[character.toLowerCase()] ?? character
}

export function spellOut(value: string, style: SpellOutStyle): string {
  if (style === "nato") {
    return [...value]
      .filter((ch) => /[a-z0-9]/i.test(ch))
      .map((ch) => (/[a-z]/i.test(ch) ? natoWord(ch) : digitWord(ch)))
      .join(" ")
  }
  if (style === "digits") {
    return [...value]
      .filter((ch) => /\d/.test(ch))
      .map(digitWord)
      .join(" ")
  }
  return value
}

export function spellForPolicy(value: string, policy: FieldPolicy): string {
  return spellOut(value, policy.spellOutStyle)
}

export function spellInstruction(policy: FieldPolicy): string {
  if (policy.spellOutStyle === "nato") {
    return "letter by letter, using words for the letters - like Alfa for A"
  }
  if (policy.spellOutStyle === "digits") {
    return "one digit at a time"
  }
  return "again, slowly"
}
