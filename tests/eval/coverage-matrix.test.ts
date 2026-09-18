import { describe, expect, it } from "vitest"
import { FieldName, policyFor } from "@/domain"
import { assignments } from "../../scripts/measure/coverage-matrix"

const rows = assignments()
const errors = rows.filter((row) => row.misheard)
const correct = rows.filter((row) => !row.misheard)

describe("which mechanism actually pays for each re-ask", () => {
  it("has recorded errors to assign at all", () => {
    expect(
      errors.length,
      "the matrix is meaningless without recorded recognizer errors; if the eval sets were emptied this must fail rather than report a clean sweep",
    ).toBeGreaterThan(0)
    expect(correct.length).toBeGreaterThan(0)
  })

  it("catches every recorded error by some mechanism", () => {
    const missed = errors.filter((row) => row.mechanism === "nothing")
    expect(
      missed.map((row) => `${row.spoken} heard as ${row.heard}`),
      "a recorded mishearing that no mechanism stops would be a wrong value written into an order",
    ).toEqual([])
  })

  it("pays nothing in false asks for the mechanism that catches them", () => {
    const catalogueFalseAsks = correct.filter((row) => row.mechanism === "catalogue_absence")
    expect(
      catalogueFalseAsks.map((row) => row.heard),
      "catalogue absence catching every error while asking about no correct value is the central claim of the matrix; a correct value landing here means the catalogue is missing a real drug",
    ).toEqual([])
  })

  it("charges every false ask to the confidence threshold alone", () => {
    const asked = correct.filter((row) => row.mechanism !== "nothing")
    const byConfidence = asked.filter((row) => row.mechanism === "confidence_threshold")
    expect(
      byConfidence.length,
      "if a false ask is ever charged to a mechanism other than the threshold, the cost side of the report is attributing it to the wrong place",
    ).toBe(asked.length)
  })

  it("does not let the confidence threshold alone stand in for the gate", () => {
    const policyThreshold = policyFor(FieldName.DrugName).autoAcceptThreshold
    expect(
      policyThreshold,
      "this test read the threshold from the policy table rather than repeating 0.95, because a literal here would keep passing after the policy changed and would then be asserting its own copy of a number instead of the product's",
    ).toBeGreaterThan(0)
    const aboveThreshold = errors.filter((row) => row.minConfidence >= policyThreshold)
    expect(
      aboveThreshold.length,
      "errors the recognizer was confident about are the reason this product exists; zero of them would mean the threshold is sufficient and the thesis is unsupported by our own data",
    ).toBeGreaterThan(0)
  })

  it("names the drug actually spoken in a real share of the errors", () => {
    const named = errors.filter((row) => row.namesTheTruth).length
    expect(
      named,
      "the consonant skeleton is published as naming the true drug in a minority of errors; if it names none, the finding is gone and the report must stop citing it",
    ).toBeGreaterThan(0)
    expect(
      named,
      "the skeleton has never named the true drug in every error, and claiming so would overstate it",
    ).toBeLessThan(errors.length)
  })
})
