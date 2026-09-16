import { describe, expect, it } from "vitest"
import { makeWordSpan } from "@/domain"
import { matchProvenance, searchedTurns, type TurnRecord } from "@/sessions"

function turn(order: number, text: string, confidence = 0.97): TurnRecord {
  return {
    turnOrder: order,
    transcript: text,
    isFormatted: false,
    words: text.split(" ").map((word, i) =>
      makeWordSpan({
        text: word,
        startMs: 1000 * order + i * 300,
        endMs: 1000 * order + i * 300 + 250,
        confidence,
      }),
    ),
  }
}

describe("provenance matching", () => {
  it("locates a hint inside the last turn and keeps its timings", () => {
    const turns = [turn(1, "hello there"), turn(2, "lisinopril ten milligrams once daily")]
    const match = matchProvenance({ hint: "ten milligrams", turns, sessionId: "s1" })

    expect(match).not.toBeNull()
    expect(match?.turnOrder).toBe(2)
    expect(match?.provenance.words.map((w) => w.text)).toEqual(["ten", "milligrams"])
    expect(match?.provenance.startMs).toBeGreaterThan(0)
    expect(match?.provenance.endMs).toBeGreaterThan(Number(match?.provenance.startMs))
  })

  it("ignores case and punctuation in the hint", () => {
    const turns = [turn(4, "the drug is Lisinopril, ten milligrams")]
    expect(matchProvenance({ hint: "LISINOPRIL", turns, sessionId: "s1" })).not.toBeNull()
  })

  it("returns null when the model paraphrased the hint", () => {
    const turns = [turn(2, "lisinopril ten milligrams")]
    expect(matchProvenance({ hint: "twenty milligrams", turns, sessionId: "s1" })).toBeNull()
    expect(matchProvenance({ hint: "", turns, sessionId: "s1" })).toBeNull()
  })

  it("searches only the recent turn window", () => {
    const turns = [turn(1, "clonazepam"), turn(2, "b"), turn(3, "c"), turn(4, "d")]
    expect(
      matchProvenance({ hint: "clonazepam", turns, sessionId: "s1", window: 3 }),
    ).toBeNull()
    expect(
      matchProvenance({ hint: "clonazepam", turns, sessionId: "s1", window: 4 }),
    ).not.toBeNull()
  })

  it("reports which turns it searched", () => {
    const turns = [turn(1, "a"), turn(2, "b"), turn(3, "c"), turn(4, "d")]
    expect(searchedTurns(turns)).toEqual([2, 3, 4])
  })

  it("carries the minimum confidence over the matched span, not the turn", () => {
    const words = [
      makeWordSpan({ text: "lisinopril", startMs: 0, endMs: 500, confidence: 0.99 }),
      makeWordSpan({ text: "ten", startMs: 600, endMs: 900, confidence: 0.4 }),
    ]
    const turns: TurnRecord[] = [
      { turnOrder: 1, transcript: "lisinopril ten", isFormatted: false, words },
    ]

    const drug = matchProvenance({ hint: "lisinopril", turns, sessionId: "s1" })
    expect(drug?.provenance.minConfidence).toBe(0.99)

    const number = matchProvenance({ hint: "ten", turns, sessionId: "s1" })
    expect(number?.provenance.minConfidence).toBe(0.4)
  })
})
