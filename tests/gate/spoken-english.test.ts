import { describe, expect, it } from "vitest"
import { FIELD_NAMES, type FieldName, type NormalizedValue, policyFor } from "@/domain"
import {
  abortUtterance,
  acceptUtterance,
  checksumUtterance,
  comboUtterance,
  escalateUtterance,
  lowConfidenceUtterance,
  noValidatorUtterance,
  readBackUtterance,
  ruleForbidsUtterance,
  spellOutUtterance,
  spokenField,
  spokenFieldLeading,
} from "@/gate/utterance"

const VALUE = "1234567890" as NormalizedValue

function everySentenceFor(field: FieldName): readonly string[] {
  const policy = policyFor(field)
  return [
    abortUtterance(field),
    acceptUtterance(field, VALUE),
    checksumUtterance(field, VALUE, policy),
    comboUtterance("Something disagrees"),
    escalateUtterance(),
    lowConfidenceUtterance(field, VALUE),
    noValidatorUtterance(field, VALUE),
    readBackUtterance(field, VALUE),
    ruleForbidsUtterance(field, "A rule forbids it"),
    spellOutUtterance(field, policy),
  ]
}

describe("what the agent says aloud is grammatical English", () => {
  it("never doubles an article, because every field name already carries one", () => {
    for (const field of FIELD_NAMES) {
      for (const sentence of everySentenceFor(field)) {
        expect(
          sentence.toLowerCase(),
          `"${sentence}" doubles an article. Every SPOKEN_FIELD value begins with "the", so a sentence that prefixes another one is heard by the caller on a real call; this was live on the checksum branch and visible on screen before it was caught`,
        ).not.toMatch(/\bthe the\b/)
      }
    }
  })

  it("keeps the article inside the field name rather than at the call site", () => {
    for (const field of FIELD_NAMES) {
      expect(
        spokenField(field),
        `${field} must carry its own article, because the sentences interpolate it mid-clause where a bare noun would read wrong`,
      ).toMatch(/^the /)
    }
  })

  it("capitalises the leading form without adding a second word", () => {
    for (const field of FIELD_NAMES) {
      const leading = spokenFieldLeading(field)
      expect(
        leading,
        "a sentence that opens on a field name needs a capital, and taking it from the same table is what stops the two forms drifting apart",
      ).toBe(`The ${spokenField(field).slice(4)}`)
    }
  })

  it("starts every spoken sentence with a capital letter", () => {
    for (const field of FIELD_NAMES) {
      for (const sentence of everySentenceFor(field)) {
        const first = sentence.charAt(0)
        expect(
          first === first.toUpperCase(),
          `"${sentence}" opens in lower case; the caller hears this read out and a sentence that starts mid-thought sounds like a dropped word`,
        ).toBe(true)
      }
    }
  })

  it("never runs two spaces together, which a synthesiser reads as a pause", () => {
    for (const field of FIELD_NAMES) {
      for (const sentence of everySentenceFor(field)) {
        expect(
          sentence,
          `"${sentence}" holds a doubled space, usually left by an interpolation that resolved to nothing`,
        ).not.toMatch(/ {2}/)
      }
    }
  })
})
