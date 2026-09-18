import { describe, expect, it } from "vitest"
import { buildAbCorpus } from "../../scripts/measure/ab-corpus"
import { runAbCase, summarise } from "../../scripts/measure/ab-report"

function run(lasaChecked: boolean) {
  return summarise(buildAbCorpus(20260916).map((entry) => runAbCase(entry, lasaChecked)))
}

describe("the gate against a confidence threshold alone", () => {
  it("builds a corpus that carries both mishearings and correct values", () => {
    const corpus = buildAbCorpus(20260916)
    expect(corpus.filter((entry) => entry.misheard).length).toBeGreaterThan(0)
    expect(corpus.filter((entry) => !entry.misheard).length).toBeGreaterThan(0)
  })

  it("writes no misheard value when the pair check is on", () => {
    expect(run(true).wrongWritten).toBe(0)
  })

  it("lets misheard values through when only the threshold guards the field", () => {
    const off = run(false)
    expect(
      off.wrongWritten,
      "a threshold alone must be shown to fail, otherwise the comparison proves nothing",
    ).toBeGreaterThan(0)
  })

  it("charges no extra false asks for the pair check", () => {
    expect(
      run(true).falseAsks,
      "the pair check must not re-ask a correct value that the threshold already accepted",
    ).toBe(run(false).falseAsks)
  })

  it("re-asks correct values that were spoken indistinctly, and reports it", () => {
    const on = run(true)
    expect(
      on.falseAsks,
      "a corpus where every correct value is confident cannot measure the cost of the idea",
    ).toBeGreaterThan(0)
  })
})
