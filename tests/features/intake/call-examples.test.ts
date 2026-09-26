import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import {
  CALL_EXAMPLE_DRUG,
  CALL_EXAMPLE_NPI_DIGITS,
  CALL_EXAMPLES,
} from "@/features/intake/intake-screen/intake-prompt"
import { lasaRiskFor } from "@/lasa"
import { validateNpi } from "@/validators/npi"

const SPOKEN_DIGIT: Readonly<Record<string, string>> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
}

function spokenDigits(line: string): string {
  return line
    .toLowerCase()
    .split(/[^a-z]+/)
    .map((word) => SPOKEN_DIGIT[word] ?? "")
    .join("")
}

describe("the examples on the call page are ones an ordinary caller can follow to a clean order", () => {
  it("dictates an NPI that passes its checksum, spoken digit by digit", () => {
    const line = CALL_EXAMPLES.find((example) => /NPI/.test(example)) ?? ""
    expect(spokenDigits(line)).toBe(CALL_EXAMPLE_NPI_DIGITS)
    expect(
      validateNpi(CALL_EXAMPLE_NPI_DIGITS).outcome,
      "the call page reused the judge's adversarial NPI, which fails on purpose; a caller who copied it saw a refusal and concluded the product was broken (r1-A1 A1-03)",
    ).toBe(VerdictOutcome.Passed)
  })

  it("names a drug that is on no published look-alike pair", () => {
    expect(
      CALL_EXAMPLES.some((example) => example.toLowerCase().includes(CALL_EXAMPLE_DRUG)),
    ).toBe(true)
    expect(
      lasaRiskFor(CALL_EXAMPLE_DRUG).hit,
      "a look-alike drug triggers the contrastive re-ask, which belongs on the judge's page with its explanation, not in an unlabelled example",
    ).toBe(false)
  })

  it("includes the patient, whom the hint asks for", () => {
    expect(CALL_EXAMPLES.some((example) => /^Patient\b/.test(example))).toBe(true)
  })
})
