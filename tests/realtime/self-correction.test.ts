import { describe, expect, it } from "vitest"
import { findSpanForValue, turnToWordSpans } from "@/realtime/turn-matcher"

function spansFor(transcript: string) {
  const words = transcript.split(" ").map((text, index) => ({
    text,
    start: 1000 + index * 300,
    end: 1200 + index * 300,
    confidence: 0.98,
    word_is_final: true,
  }))
  return turnToWordSpans({ words } as never)
}

const CORRECTED = "lisinopril no wait losartan"

describe("a caller who corrects themselves inside one utterance", () => {
  it("finds provenance for the value the caller settled on", () => {
    const span = findSpanForValue(spansFor(CORRECTED), "losartan")
    expect(
      span.map((word) => word.text),
      "the corrected value is in the turn, so the agent proposing it must be able to prove where it came from",
    ).toEqual(["losartan"])
  })

  it("also finds provenance for the value the caller retracted, which is the known gap", () => {
    const span = findSpanForValue(spansFor(CORRECTED), "lisinopril")
    expect(
      span.map((word) => word.text),
      "the retracted word was genuinely spoken, so the matcher proves it was said; nothing here knows it was withdrawn",
    ).toEqual(["lisinopril"])
  })

  it("returns the first occurrence when a value is said twice", () => {
    const span = findSpanForValue(spansFor("metformin then metformin again"), "metformin")
    expect(span.length).toBe(1)
    expect(
      span[0]?.startMs,
      "the matcher is documented as taking the earliest match; a change here would silently move every timecode",
    ).toBe(1000)
  })

  it("does not invent a span for a value nobody said", () => {
    const span = findSpanForValue(spansFor(CORRECTED), "warfarin")
    expect(
      span,
      "a value absent from the turn must get no provenance at all, which is what makes E_PROVENANCE_NOT_FOUND reachable",
    ).toEqual([])
  })
})
