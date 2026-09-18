import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import {
  LASA_CANDIDATE,
  QUANTITY_CANDIDATE,
  STRENGTH_CANDIDATE,
} from "@/features/judge-demo/scenario"

const CANDIDATES = [LASA_CANDIDATE, STRENGTH_CANDIDATE, QUANTITY_CANDIDATE]

function drugNameIn(evidence: unknown): string | null {
  if (typeof evidence !== "object" || evidence === null) {
    return null
  }
  const named = (evidence as { drugName?: unknown }).drugName
  return typeof named === "string" ? named : null
}

describe("the recorded scenario cannot cite evidence the session never established", () => {
  it("heard a drug name that the recognizer actually returned", () => {
    expect(LASA_CANDIDATE.field).toBe(FieldName.DrugName)
    expect(LASA_CANDIDATE.normalizedValue).toBe("bisoprolol")
  })

  it("validates every dependent field against the drug the session heard, not the right one", () => {
    const heard = String(LASA_CANDIDATE.normalizedValue)
    for (const candidate of CANDIDATES) {
      const cited = drugNameIn(candidate.verdict.evidence)
      if (cited === null) {
        continue
      }
      expect(
        cited.startsWith(heard),
        `${candidate.field} cites ${cited} as evidence while the session heard ${heard}; validating a dependent field against a drug the caller never confirmed is the error the gate exists to prevent, and staging it makes the demo argue against itself`,
      ).toBe(true)
    }
  })

  it("keeps the same claim in the detail string as in the evidence", () => {
    for (const candidate of CANDIDATES) {
      const cited = drugNameIn(candidate.verdict.evidence)
      if (cited === null) {
        continue
      }
      expect(
        candidate.verdict.detail.includes(cited),
        `${candidate.field} says one drug in prose and another in evidence`,
      ).toBe(true)
    }
  })

  it("shares one session and one transcript across every candidate", () => {
    const sessions = new Set(CANDIDATES.map((c) => c.provenance.sessionId))
    expect(sessions.size, "a scenario spanning two sessions is not one recording").toBe(1)
  })
})
