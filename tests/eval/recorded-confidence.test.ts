import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { policyFor } from "@/domain/policy"

const RESULT = "eval/dev/result-plain.json"

type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
  readonly closeCode: number
}

type Result = {
  readonly entityErrorRate: number
  readonly spacingMs?: number
  readonly scored: readonly Scored[]
}

function load(): Result | null {
  if (!existsSync(RESULT)) {
    return null
  }
  return JSON.parse(readFileSync(RESULT, "utf8")) as Result
}

describe("the recorded recognizer run", () => {
  it("is present, or the report must not cite it", () => {
    const result = load()
    if (result === null) {
      expect(
        readFileSync("eval/REPORT.md", "utf8").includes("| development, LASA terms | **40**"),
        "eval/REPORT.md cites a recorded run that no longer exists on disk; rerun make eval or drop the row",
      ).toBe(false)
      return
    }
    expect(result.scored.length).toBeGreaterThan(0)
  })

  it("was spaced far enough apart that the rate limiter was not what it measured", () => {
    const result = load()
    if (result === null) {
      return
    }
    if (result.spacingMs !== undefined) {
      expect(
        result.spacingMs,
        "sessions closer than 5 per minute close with 1008 and transcribe as nothing, which reads as a recognizer error and is not one",
      ).toBeGreaterThanOrEqual(12000)
    }
    expect(
      result.scored.every((entry) => entry.closeCode === 1000),
      "every socket must have closed cleanly, otherwise the rate is measuring transport and not recognition",
    ).toBe(true)
  })

  it("carries correct values that still fall under the drugName threshold", () => {
    const result = load()
    if (result === null) {
      return
    }
    const threshold = policyFor(FieldName.DrugName).autoAcceptThreshold
    const correctButQuiet = result.scored.filter(
      (entry) => entry.correct && entry.minConfidence < threshold,
    )
    expect(
      correctButQuiet.length,
      "a corpus where every correct value clears the threshold cannot measure the cost of the threshold at all",
    ).toBeGreaterThan(0)
  })
})
