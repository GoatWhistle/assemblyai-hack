import { describe, expect, it } from "vitest"
import { matchProvenance, type TurnRecord } from "@/confirmation"
import { makeWordSpan, RETRACTED_VALUE_CODE } from "@/domain"

function turnOf(transcript: string): TurnRecord {
  return {
    turnOrder: 1,
    transcript,
    isFormatted: false,
    words: transcript.split(" ").map((text, index) =>
      makeWordSpan({
        text,
        startMs: 1000 + index * 300,
        endMs: 1200 + index * 300,
        confidence: 0.98,
      }),
    ),
  }
}

function spanFor(transcript: string, hint: string): readonly string[] {
  const match = matchProvenance({ hint, turns: [turnOf(transcript)], sessionId: "s1" })
  return match === null ? [] : match.provenance.words.map((word) => word.text)
}

const CORRECTED = "lisinopril no wait losartan"

describe("a caller who corrects themselves inside one utterance", () => {
  it("finds provenance for the value the caller settled on", () => {
    expect(
      spanFor(CORRECTED, "losartan"),
      "the corrected value is in the turn, so the agent proposing it must be able to prove where it came from",
    ).toEqual(["losartan"])
  })

  it("still finds the retracted word, because it was said; spoken support is what refuses it", () => {
    expect(
      spanFor(CORRECTED, "lisinopril"),
      "provenance answers whether a word was spoken, which it was; whether it was withdrawn is judged as E_RETRACTED_VALUE (tests/confirmation/self-correction.test.ts)",
    ).toEqual(["lisinopril"])
    expect(RETRACTED_VALUE_CODE).toBe("E_RETRACTED_VALUE")
  })

  it("returns the first occurrence when a value is said twice", () => {
    const match = matchProvenance({
      hint: "metformin",
      turns: [turnOf("metformin then metformin again")],
      sessionId: "s1",
    })
    expect(match?.provenance.words.length).toBe(1)
    expect(
      match?.provenance.startMs,
      "the matcher takes the earliest match; a change here would silently move every timecode",
    ).toBe(1000)
  })

  it("does not invent a span for a value nobody said", () => {
    expect(
      spanFor(CORRECTED, "warfarin"),
      "a value absent from the turn must get no provenance at all, which is what makes E_PROVENANCE_NOT_FOUND reachable",
    ).toEqual([])
  })
})
