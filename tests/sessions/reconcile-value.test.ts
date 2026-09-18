import { describe, expect, it } from "vitest"
import { FieldName, makeWordSpan } from "@/domain"
import { LASA_PAIRS } from "@/lasa/pairs"
import { reconcileValue, type TurnRecord, unsupportedValueVerdict } from "@/sessions"

function turn(text: string, confidence = 0.99): TurnRecord {
  return {
    turnOrder: 1,
    transcript: text,
    isFormatted: false,
    words: text.split(" ").map((word, i) =>
      makeWordSpan({
        text: word,
        startMs: 1000 + i * 300,
        endMs: 1000 + i * 300 + 250,
        confidence,
      }),
    ),
  }
}

function supported(value: string, spoken: string): boolean {
  return reconcileValue({ value, turn: turn(spoken) }).supported
}

describe("reconciling a proposed value against the words of its turn", () => {
  it("refuses every LASA counterpart that was not the word spoken", () => {
    for (const pair of LASA_PAIRS) {
      expect(
        supported(pair.termB, `${pair.termA} ten milligrams`),
        `${pair.termB} was accepted against spoken ${pair.termA}; a curated pair is precisely the substitution the product exists to catch, and a tolerance wide enough to accept it makes the whole check decorative`,
      ).toBe(false)
      expect(
        supported(pair.termA, `${pair.termB} ten milligrams`),
        `${pair.termA} was accepted against spoken ${pair.termB}; the check has to hold in both directions or the agent picks the one that passes`,
      ).toBe(false)
    }
  })

  it("accepts each pair term against itself, so the refusal above is not blanket", () => {
    for (const pair of LASA_PAIRS) {
      expect(
        supported(pair.termA, `${pair.termA} ten milligrams`),
        `${pair.termA} was refused against itself, which would mean the check refuses correct values and no order could ever be taken`,
      ).toBe(true)
    }
  })

  it("sees through spoken units and spelled numbers", () => {
    expect(
      supported("10 mg", "ten milligrams"),
      "the normalizer is allowed to turn spoken words into a canonical form; reconciliation that cannot follow it would contradict the rest of the pipeline",
    ).toBe(true)
    expect(supported("200 mg", "two hundred milligrams")).toBe(true)
    expect(supported("30", "thirty")).toBe(true)
    expect(supported("500 mcg", "five hundred micrograms")).toBe(true)
  })

  it("does not accept a different number just because a number was spoken", () => {
    expect(
      supported("20 mg", "ten milligrams"),
      "a tenfold dosing error is the error class with the worst outcome; accepting any digit because some digit was spoken would let it through silently",
    ).toBe(false)
    expect(
      supported("10 mcg", "ten milligrams"),
      "milligrams against micrograms is a thousandfold error and the units are different spoken words, so the mismatch has to be visible",
    ).toBe(false)
  })

  it("reads a dictated identifier as the compacted digits", () => {
    expect(
      supported("1245319599", "one two four five three one nine five nine nine"),
      "the product asks for identifiers to be spelled out, so a check that refused the spelled form would break its own recovery path",
    ).toBe(true)
    expect(
      supported("AB1234563", "AB one two three four five six three"),
      "a DEA number is two letters then seven digits and is dictated exactly that way",
    ).toBe(true)
    expect(
      supported("1245319598", "one two four five three one nine five nine nine"),
      "a last digit nobody said must not ride along on the digits that were said; that digit is the entire checksum",
    ).toBe(false)
  })

  it("ignores a salt suffix in either direction", () => {
    expect(supported("tramadol", "tramadol hydrochloride fifty milligrams")).toBe(true)
    expect(
      supported("tramadol hydrochloride", "tramadol fifty milligrams"),
      "the built catalogue stores the salt and the speaker does not have to say it, so which side carries the suffix cannot decide the outcome",
    ).toBe(true)
  })

  it("tolerates a vowel substitution, which is the recorded recognition error", () => {
    expect(
      supported("vinorelbine", "venorelbine ten milligrams"),
      "venorelbine for vinorelbine shares a consonant skeleton and is a recognition slip, not a substituted drug; refusing it here would hide the catalogue verdict that names the neighbour",
    ).toBe(true)
  })

  it("refuses a value with nothing spoken behind it at all", () => {
    const result = reconcileValue({
      value: "bisoprolol",
      turn: turn("lisinopril ten milligrams"),
    })
    expect(result.supported).toBe(false)
    expect(
      result.unsupportedTokens,
      "the refusal has to name the token nothing accounts for, or it cannot be audited after the call",
    ).toContain("bisoprolol")
    expect(result.spokenText).toContain("lisinopril")
  })

  it("refuses an empty value rather than calling it supported by default", () => {
    expect(
      reconcileValue({ value: "   ", turn: turn("lisinopril") }).supported,
      "absence must never read as success; a value with no tokens has nothing spoken behind it by definition",
    ).toBe(false)
  })

  it("cites its own rule rather than borrowing a checksum it never ran", () => {
    const reconciliation = reconcileValue({
      value: "bisoprolol",
      turn: turn("lisinopril ten milligrams"),
    })
    const verdict = unsupportedValueVerdict({
      field: FieldName.DrugName,
      value: "bisoprolol",
      reconciliation,
    })

    expect(
      verdict.validatorName,
      "naming another validator would claim a proof that never ran, which is the one thing the report rules forbid",
    ).toBe("spoken_support")
    expect(verdict.ruleCited.length).toBeGreaterThan(0)
    expect(
      verdict.detail,
      "the caller-facing sentence has to quote what was actually heard so the disagreement is nameable out loud",
    ).toContain("lisinopril")
  })
})
