import { describe, expect, it } from "vitest"
import type { SttTurn } from "@/realtime/protocol"
import { findSpanForValue, TurnMatcher, turnToWordSpans } from "@/realtime/turn-matcher"

const TURN: SttTurn = {
  type: "Turn",
  turn_order: 2,
  turn_is_formatted: true,
  end_of_turn: true,
  transcript: "Bisoprolol ten milligrams, thirty tablets.",
  end_of_turn_confidence: 0.99,
  words: [
    { text: "Bisoprolol", start: 6800, end: 7620, confidence: 0.99 },
    { text: "ten", start: 7640, end: 7860, confidence: 0.98 },
    { text: "milligrams", start: 7880, end: 8320, confidence: 0.97 },
    { text: "thirty", start: 8340, end: 8640, confidence: 0.96 },
    { text: "tablets", start: 8660, end: 9080, confidence: 0.98 },
  ],
}

describe("turnToWordSpans", () => {
  it("renames the protocol start and end into explicit millisecond fields", () => {
    const words = turnToWordSpans(TURN)
    expect(words[0]?.startMs).toBe(6800)
    expect(words[0]?.endMs).toBe(7620)
    expect(words.length).toBe(5)
  })
})

describe("findSpanForValue", () => {
  it("finds a single spoken word and returns just its span", () => {
    const span = findSpanForValue(turnToWordSpans(TURN), "Bisoprolol")
    expect(span.map((word) => word.text)).toEqual(["Bisoprolol"])
    expect(span[0]?.startMs).toBe(6800)
  })

  it("finds a multi-word value as a contiguous span", () => {
    const span = findSpanForValue(turnToWordSpans(TURN), "ten milligrams")
    expect(span.map((word) => word.text)).toEqual(["ten", "milligrams"])
  })

  it("finds the later phrase rather than stopping at the first partial match", () => {
    const span = findSpanForValue(turnToWordSpans(TURN), "thirty tablets")
    expect(span[0]?.startMs).toBe(8340)
  })

  it("returns nothing for a value that was never spoken", () => {
    expect(findSpanForValue(turnToWordSpans(TURN), "Lisinopril")).toEqual([])
  })

  it("returns nothing for empty input rather than matching everything", () => {
    expect(findSpanForValue(turnToWordSpans(TURN), "")).toEqual([])
  })
})

describe("TurnMatcher", () => {
  it("builds provenance whose confidences come from the source words", () => {
    const matcher = new TurnMatcher()
    matcher.record(TURN, 8400)
    const found = matcher.provenanceFor("ten milligrams", "sess-1", 8500)
    expect(found).not.toBeNull()
    expect(found?.provenance.startMs).toBe(7640)
    expect(found?.provenance.endMs).toBe(8320)
    expect(found?.provenance.minConfidence).toBeCloseTo(0.97, 5)
    expect(found?.provenance.turnOrder).toBe(2)
    expect(found?.provenance.sessionId).toBe("sess-1")
  })

  it("carries the formatted flag through, because the slice differs from the words", () => {
    const matcher = new TurnMatcher()
    matcher.record(TURN, 8400)
    const found = matcher.provenanceFor("Bisoprolol", "sess-1", 8500)
    expect(found?.provenance.sttTurnIsFormatted).toBe(true)
    expect(found?.provenance.transcriptSlice).toBe(TURN.transcript)
  })

  it("does not match a turn that is older than the window", () => {
    const matcher = new TurnMatcher(1000)
    matcher.record(TURN, 1000)
    expect(matcher.provenanceFor("Bisoprolol", "sess-1", 9000)).toBeNull()
  })

  it("prefers the most recent turn when two could match", () => {
    const matcher = new TurnMatcher()
    matcher.record(TURN, 8400)
    matcher.record(
      {
        ...TURN,
        turn_order: 4,
        transcript: "Bisoprolol again",
        words: [{ text: "Bisoprolol", start: 12000, end: 12800, confidence: 0.91 }],
      },
      12900,
    )
    const found = matcher.provenanceFor("Bisoprolol", "sess-1", 13000)
    expect(found?.provenance.turnOrder).toBe(4)
    expect(found?.provenance.startMs).toBe(12000)
  })

  it("replaces rather than duplicates a revised turn of the same order", () => {
    const matcher = new TurnMatcher()
    matcher.record(TURN, 8400)
    matcher.record({ ...TURN, transcript: "revised" }, 8500)
    expect(matcher.size).toBe(1)
    expect(matcher.byOrder(2)?.turn.transcript).toBe("revised")
  })

  it("clears on reset so one session's words cannot leak into the next", () => {
    const matcher = new TurnMatcher()
    matcher.record(TURN, 8400)
    matcher.reset()
    expect(matcher.size).toBe(0)
    expect(matcher.latest()).toBeNull()
  })
})
