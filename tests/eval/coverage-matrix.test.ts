import { describe, expect, it } from "vitest"
import { FieldName, policyFor } from "@/domain"
import { reflexYesWrites } from "../../scripts/arms/shipped-policy"
import { assignments } from "../../scripts/measure/coverage-matrix"

const rows = assignments()
const errors = rows.filter((row) => row.misheard)
const correct = rows.filter((row) => !row.misheard)

describe("which mechanism actually pays for each ask, under the shipped policy", () => {
  it("has recorded errors to assign at all", () => {
    expect(
      errors.length,
      "the matrix is meaningless without recorded recognizer errors; if the eval sets were emptied this must fail rather than report a clean sweep",
    ).toBeGreaterThan(0)
    expect(correct.length).toBeGreaterThan(0)
  })

  it("writes no recorded error without a question", () => {
    expect(
      errors.filter((row) => row.mechanism === "accepted").map((row) => row.heard),
    ).toEqual([])
  })

  it("stops every recorded error before a plain read-back and the caller's ear", () => {
    expect(
      errors
        .filter((row) => reflexYesWrites(row.mechanism))
        .map((row) => `${row.spoken} heard as ${row.heard}`),
      "an error left to a plain read-back depends on the caller noticing it",
    ).toEqual([])
  })

  it("asks about every correct drug name, because the drug name is read back by regulation", () => {
    expect(
      correct.filter((row) => row.mechanism === "accepted").map((row) => row.heard),
    ).toEqual([])
    expect(
      correct.filter((row) => row.mechanism === "standing_read_back").length,
      "the standing read-back must appear as its own ask class, never as a value accepted",
    ).toBeGreaterThan(0)
  })

  it("pays nothing in asks for the mechanism that catches the errors", () => {
    expect(
      correct.filter((row) => row.mechanism === "catalogue_absence").map((row) => row.heard),
      "a correct value landing here means the catalogue is missing a real drug",
    ).toEqual([])
  })

  it("does not let the confidence threshold alone stand in for the gate", () => {
    const threshold = policyFor(FieldName.DrugName).autoAcceptThreshold
    expect(
      errors.filter((row) => row.minConfidence >= threshold).length,
      "errors the recognizer was confident about are the reason this product exists",
    ).toBeGreaterThan(0)
  })

  it("names the drug actually spoken in a real share of the errors", () => {
    const named = errors.filter((row) => row.namesTheTruth).length
    expect(named).toBeGreaterThan(0)
    expect(named).toBeLessThan(errors.length)
  })
})
