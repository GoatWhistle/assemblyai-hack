import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const RESAMPLED = "eval/control/result-plain.json"
const NATIVE = "eval/native16/result-plain.json"

type Scored = {
  readonly spoken: string
  readonly correct: boolean
  readonly minConfidence: number
}

function load(path: string): readonly Scored[] | null {
  if (!existsSync(path)) {
    return null
  }
  return (JSON.parse(readFileSync(path, "utf8")) as { scored: readonly Scored[] }).scored
}

function outcomes(scored: readonly Scored[]): Map<string, Scored> {
  return new Map(scored.map((entry) => [entry.spoken, entry]))
}

describe("the resampler is not what produced the recognizer errors", () => {
  it("has both arms recorded, or the report must not cite the comparison", () => {
    const resampled = load(RESAMPLED)
    const native = load(NATIVE)
    if (resampled === null || native === null) {
      expect(
        readFileSync("eval/REPORT.md", "utf8").includes("synthesised natively at 16000"),
        "the report cites a native-rate arm whose recorded run is missing from disk",
      ).toBe(false)
      return
    }
    expect(resampled.length).toBeGreaterThan(0)
    expect(native.length).toBe(resampled.length)
  })

  it("reproduces most errors without any resampling in the path", () => {
    const resampled = load(RESAMPLED)
    const native = load(NATIVE)
    if (resampled === null || native === null) {
      return
    }
    const a = outcomes(resampled)
    const b = outcomes(native)
    const shared = [...a.keys()].filter((term) => b.has(term))
    const wrongInBoth = shared.filter(
      (term) => a.get(term)?.correct === false && b.get(term)?.correct === false,
    )
    const wrongInResampledOnly = shared.filter(
      (term) => a.get(term)?.correct === false && b.get(term)?.correct === true,
    )

    expect(
      wrongInBoth.length,
      "if no error survived removing the resampler, the published rate measured our own pipeline",
    ).toBeGreaterThan(wrongInResampledOnly.length)
  })

  it("keeps the two above-threshold mishearings above the threshold at native rate", () => {
    const native = load(NATIVE)
    if (native === null) {
      return
    }
    const b = outcomes(native)
    for (const term of ["vinorelbine", "glycopyrronium"]) {
      const entry = b.get(term)
      if (entry === undefined) {
        continue
      }
      expect(entry.correct, `${term} is the whole point: it must still be misheard`).toBe(false)
      expect(
        entry.minConfidence,
        `${term} misheard below the threshold would be caught by confidence alone and prove nothing`,
      ).toBeGreaterThanOrEqual(0.95)
    }
  })
})
