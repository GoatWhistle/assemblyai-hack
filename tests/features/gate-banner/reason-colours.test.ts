import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { ReasonCode } from "@/domain"
import { describeReason, SEVERITY_STATUS } from "@/features/gate-banner/reason-language"
import { STATUS_TONE } from "@/shared/ui/primitives/status-chip"

const SEMANTIC = readFileSync("src/styles/tokens/semantic.css", "utf8")

function aliasOf(token: string): string {
  let current = token
  for (let step = 0; step < 8; step += 1) {
    const next = new RegExp(String.raw`${current}:\s*var\((--[a-z0-9-]+)\)`).exec(SEMANTIC)?.[1]
    if (next === undefined) {
      return current
    }
    current = next
  }
  return current
}

describe("A3-07: the three reasons to re-ask are never painted alike", () => {
  it("gives low confidence, a validator failure and a LASA pair three different tones", () => {
    const tones = [
      ReasonCode.LowConfidence,
      ReasonCode.ValidatorChecksum,
      ReasonCode.LasaHit,
    ].map((code) => STATUS_TONE[SEVERITY_STATUS[describeReason(code).severity]])
    expect(new Set(tones).size).toBe(3)
  })

  it("paints a validator failure as its own refusal family, never as the harm red", () => {
    for (const code of [
      ReasonCode.ValidatorChecksum,
      ReasonCode.ValidatorFormat,
      ReasonCode.ValidatorCatalog,
      ReasonCode.ValidatorCombo,
    ]) {
      expect(STATUS_TONE[SEVERITY_STATUS[describeReason(code).severity]]).toBe("validator")
    }
    for (const part of ["ink", "surface", "line"]) {
      expect(
        aliasOf(`--reason-validator-${part}`),
        "red means a wrong value entered the order; a checksum refusal is the gate succeeding",
      ).not.toBe(aliasOf(`--verdict-refused-${part}`))
    }
  })
})

describe("A3-12: a LASA hit does not share the colour of the primary action", () => {
  it("resolves the LASA ink, surface and line to a hue other than the action violet", () => {
    for (const part of ["ink", "surface", "line"]) {
      const lasa = aliasOf(`--state-lasa-${part}`)
      expect(lasa, `--state-lasa-${part} resolves to ${lasa}`).not.toMatch(/violet/)
    }
    expect(aliasOf("--action-rest")).toBe("--violet")
  })

  it("defines one semantic family per reason and per final verdict", () => {
    for (const family of [
      "reason-threshold",
      "reason-validator",
      "reason-lasa",
      "verdict-committed",
      "verdict-refused",
    ]) {
      for (const part of ["ink", "surface", "line"]) {
        expect(SEMANTIC).toContain(`--${family}-${part}:`)
      }
    }
  })
})
