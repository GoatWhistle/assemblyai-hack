import { describe, expect, it } from "vitest"
import { normalizeDrugName, normalizeTerm, SALT_SUFFIX_COUNT, stripSalt } from "@/lasa"

describe("salt stripping", () => {
  it("strips the salt that hides a lasa term", () => {
    expect(stripSalt("tramadol hydrochloride")).toBe("tramadol")
    expect(stripSalt("bisoprolol fumarate")).toBe("bisoprolol")
    expect(stripSalt("hydralazine hydrochloride")).toBe("hydralazine")
    expect(stripSalt("morphine sulfate")).toBe("morphine")
    expect(stripSalt("cefazolin sodium")).toBe("cefazolin")
  })

  it("strips stacked salts and hydrates", () => {
    expect(stripSalt("amlodipine besylate monohydrate")).toBe("amlodipine")
    expect(stripSalt("quetiapine fumarate anhydrous")).toBe("quetiapine")
  })

  it("leaves a bare name untouched", () => {
    expect(stripSalt("lisinopril")).toBe("lisinopril")
    expect(stripSalt("prednisone")).toBe("prednisone")
  })

  it("never strips a name down to nothing", () => {
    expect(stripSalt("sodium")).toBe("sodium")
    expect(stripSalt("magnesium")).toBe("magnesium")
  })

  it("normalizes case, punctuation and tall man spelling", () => {
    expect(normalizeTerm("vinBLAStine")).toBe("vinblastine")
    expect(normalizeTerm("  Cyclo-Serine  ")).toBe("cyclo serine")
    expect(normalizeDrugName("TRAMADOL HCl")).toBe("tramadol")
  })

  it("carries about forty salt suffixes", () => {
    expect(SALT_SUFFIX_COUNT).toBeGreaterThanOrEqual(40)
  })
})
