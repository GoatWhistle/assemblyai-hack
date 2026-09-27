import { describe, expect, it } from "vitest"
import { FAULT_STEPS } from "@/features/intake/fault-steps"
import { FAULT_COPY, SessionFault } from "@/features/intake/session-status"

const JOINERS = new Set(["and", "then", "or"])

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9()-]+/)
    .filter((word) => word !== "")
}

describe("the numbered steps are the remedy, split and never extended", () => {
  for (const fault of Object.values(SessionFault)) {
    it(`${fault} says nothing its remedy does not`, () => {
      const { steps, note } = FAULT_STEPS[fault]
      const split = words([...steps, note ?? ""].join(" "))
      const remedy = words(FAULT_COPY[fault].remedy)
      expect(split.filter((word) => !remedy.includes(word))).toEqual([])
      expect(
        remedy.filter((word) => !JOINERS.has(word) && !split.includes(word)),
        "a step dropped part of the remedy",
      ).toEqual([])
      expect(steps.length).toBeGreaterThan(0)
    })
  }
})
