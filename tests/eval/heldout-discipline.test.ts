import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const PREREGISTRATION = "eval/heldout-preregistration.md"
const TERMS = "eval/heldout/terms.json"
const SEAL = "eval/heldout.sha256"
const RESULT = "eval/heldout/result-plain.json"

type Terms = {
  readonly seed: number
  readonly count: number
  readonly terms: readonly string[]
  readonly purpose: string
  readonly strata: Readonly<Record<string, number>>
}

function terms(): Terms | null {
  return existsSync(TERMS) ? (JSON.parse(readFileSync(TERMS, "utf8")) as Terms) : null
}

describe("the held-out set keeps the discipline that makes its number mean anything", () => {
  it("has a pre-registration on disk", () => {
    expect(
      existsSync(PREREGISTRATION),
      "a held-out result without a rule fixed before opening it is just another measurement on another set",
    ).toBe(true)
  })

  it("states the decision rule, not only the prediction", () => {
    const text = readFileSync(PREREGISTRATION, "utf8")
    expect(text).toMatch(/Wilson/)
    expect(
      text,
      "the pre-registration must say what counts as demonstrated, or the result can be reinterpreted after the fact",
    ).toMatch(/overlap/i)
    expect(
      text,
      "it must also say what would falsify the hypothesis, which is the part that costs us something",
    ).toMatch(/falsif/i)
  })

  it("commits in advance to discarding a rate-limited run", () => {
    const text = readFileSync(PREREGISTRATION, "utf8")
    expect(
      text,
      "close code 1008 already produced one fabricated figure in this project; the rule to discard such a run must predate the run",
    ).toContain("1008")
  })

  it("is sealed, and the seal covers the labels rather than derived audio", () => {
    if (!existsSync(TERMS)) {
      return
    }
    expect(existsSync(SEAL)).toBe(true)
    const digest = readFileSync(SEAL, "utf8").trim()
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it("shares no term with anything already measured", () => {
    const file = terms()
    if (file === null) {
      return
    }
    const heldout = new Set(file.terms.map((term) => term.trim().toLowerCase()))
    const others = ["eval/control/terms.json", "eval/dev/manifest.json"]
    for (const path of others) {
      if (!existsSync(path)) {
        continue
      }
      const parsed = JSON.parse(readFileSync(path, "utf8")) as {
        readonly terms?: readonly string[]
        readonly items?: readonly { readonly spoken?: string }[]
      }
      const spoken =
        parsed.terms ??
        (parsed.items ?? [])
          .map((item) => item.spoken)
          .filter((value): value is string => typeof value === "string")
      expect(spoken.length, `${path} yielded no comparable terms`).toBeGreaterThan(0)
      for (const term of spoken) {
        expect(
          heldout.has(term.trim().toLowerCase()),
          `${term} appears in both ${path} and the held-out set, so the held-out set is contaminated by a tuned-on corpus`,
        ).toBe(false)
      }
    }
  })

  it("draws its strata evenly, so a difference between them is not a difference in sample size", () => {
    const file = terms()
    if (file === null) {
      return
    }
    expect(file.terms.length).toBe(file.count)
    expect(Object.keys(file.strata).length).toBeGreaterThanOrEqual(3)
  })

  it("records the spacing and every close code if a run happened", () => {
    if (!existsSync(RESULT)) {
      return
    }
    const result = JSON.parse(readFileSync(RESULT, "utf8")) as {
      readonly spacingMs?: number
      readonly scored?: readonly { readonly closeCode: number }[]
    }
    expect(
      result.spacingMs,
      "without the spacing on the record, nobody can tell whether the run measured the recognizer or the rate limiter",
    ).toBeGreaterThanOrEqual(24000)
    const codes = new Set((result.scored ?? []).map((entry) => entry.closeCode))
    expect(
      [...codes],
      "the pre-registration requires discarding any run containing a close code other than 1000",
    ).toEqual([1000])
  })
})
