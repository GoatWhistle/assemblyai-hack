import { SpellOutStyle } from "@/domain"

export const NATO: Readonly<Record<string, string>> = Object.freeze({
  A: "Alfa",
  B: "Bravo",
  C: "Charlie",
  D: "Delta",
  E: "Echo",
  F: "Foxtrot",
  G: "Golf",
  H: "Hotel",
  I: "India",
  J: "Juliett",
  K: "Kilo",
  L: "Lima",
  M: "Mike",
  N: "November",
  O: "Oscar",
  P: "Papa",
  Q: "Quebec",
  R: "Romeo",
  S: "Sierra",
  T: "Tango",
  U: "Uniform",
  V: "Victor",
  W: "Whiskey",
  X: "Xray",
  Y: "Yankee",
  Z: "Zulu",
})

const DIGIT_WORDS: Readonly<Record<string, string>> = Object.freeze({
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

export type SpellToken = {
  readonly source: string
  readonly spoken: string
}

export function spellTokens(value: string, style: SpellOutStyle): readonly SpellToken[] {
  if (style === SpellOutStyle.None) {
    return value.length === 0 ? [] : [{ source: value, spoken: value }]
  }
  if (style === SpellOutStyle.Digits) {
    return [...value]
      .filter((character) => /[0-9]/.test(character))
      .map((character) => ({
        source: character,
        spoken: DIGIT_WORDS[character] ?? character,
      }))
  }
  return [...value]
    .filter((character) => /[a-z0-9]/i.test(character))
    .map((character) => {
      const upper = character.toUpperCase()
      const nato = NATO[upper]
      if (nato !== undefined) {
        return { source: upper, spoken: nato }
      }
      return { source: character, spoken: DIGIT_WORDS[character] ?? character }
    })
}

export function spellPhrase(value: string, style: SpellOutStyle): string {
  return spellTokens(value, style)
    .map((token) => token.spoken)
    .join(" ")
}

export const SPELL_INSTRUCTION: Readonly<Record<SpellOutStyle, string>> = Object.freeze({
  nato: "letter by letter, using words for the letters - like Alfa for A",
  digits: "one digit at a time",
  none: "again, slowly",
})
