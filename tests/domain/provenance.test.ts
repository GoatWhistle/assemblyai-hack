import { describe, expect, it } from "vitest"
import { EmptyProvenanceError, makeProvenance, makeWordSpan } from "@/domain"

const span = (text: string, confidence: number, startMs: number) =>
  makeWordSpan({ text, confidence, startMs, endMs: startMs + 200 })

describe("provenance", () => {
  it("rejects a value that has no source words", () => {
    expect(() =>
      makeProvenance({ words: [], turnOrder: 0, transcriptSlice: "", sessionId: "s1" }),
    ).toThrow(EmptyProvenanceError)
  })

  it("aggregates confidence by minimum, not by mean", () => {
    const p = makeProvenance({
      words: [
        span("lisinopril", 0.42, 0),
        span("ten", 0.99, 200),
        span("milligrams", 0.99, 400),
      ],
      turnOrder: 1,
      transcriptSlice: "lisinopril ten milligrams",
      sessionId: "s1",
    })
    expect(p.minConfidence).toBe(0.42)
    expect(p.meanConfidence).toBeCloseTo(0.8, 2)
  })

  it("spans the full interval of its words", () => {
    const p = makeProvenance({
      words: [span("ten", 0.9, 400), span("milligrams", 0.9, 0)],
      turnOrder: 0,
      transcriptSlice: "ten milligrams",
      sessionId: "s1",
    })
    expect(p.startMs).toBe(0)
    expect(p.endMs).toBe(600)
  })
})
