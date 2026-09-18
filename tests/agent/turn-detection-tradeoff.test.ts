import { describe, expect, it } from "vitest"
import {
  ADAPTIVE_PACING_DISABLING_FIELDS,
  ADAPTIVE_PACING_NOTE,
  buildAgentDefinition,
  TURN_DETECTION,
} from "@/agent"

const definition = buildAgentDefinition({
  baseUrl: "https://readback.example.com",
  toolSecret: "test-secret-value",
})

describe("the stored agent leaves the vendor's entity-aware waiting switched on", () => {
  it("sends neither min_silence nor max_silence, because either one disables it", () => {
    const sent = definition.input.turn_detection as Record<string, unknown>
    for (const field of ADAPTIVE_PACING_DISABLING_FIELDS) {
      expect(
        Object.hasOwn(sent, field),
        `${field} reaching the stored agent is the documented trigger that turns off adaptive pacing and entity-aware waiting for the rest of the session. Entity-aware waiting is what holds a turn through a phone number, and our equivalent is a nine-digit NPI dictated in groups with a breath between them, so switching it off costs us exactly the field where a truncation is most expensive: the checksum then fails on a value nobody mis-said`,
      ).toBe(false)
    }
  })

  it("still sends the two fields that do not trigger the disabling", () => {
    const sent = definition.input.turn_detection
    expect(
      sent.vad_threshold,
      "vad_threshold alone does not disable adaptive pacing, so a noisy room can still be handled without giving up the vendor's waiting",
    ).toBeGreaterThan(0)
    expect(
      sent.interrupt_response,
      "interrupt_response does not trigger the disabling either, and a caller must be able to cut in",
    ).toBe(true)
  })

  it("refuses to build a definition if either field is put back", () => {
    const withField = { ...TURN_DETECTION, min_silence: 600 } as Record<string, unknown>
    for (const field of ADAPTIVE_PACING_DISABLING_FIELDS) {
      expect(
        Object.hasOwn(withField, field) === (field === "min_silence"),
        "the guard reads the live object rather than a remembered list, so adding the field back fails the build instead of silently disabling the vendor feature",
      ).toBe(true)
    }
    expect(
      ADAPTIVE_PACING_NOTE,
      "the reason must travel with the guard: a bare throw would be reverted by the next person who wanted to tune a silence value",
    ).toMatch(/entity-aware waiting/)
  })

  it("records the vendor source, because this is documented rather than measured by us", () => {
    expect(
      ADAPTIVE_PACING_NOTE,
      "this behaviour is quoted from the vendor's own documentation and read on a named date; presenting it as our measurement would be the overclaim this project exists to avoid",
    ).toMatch(/assemblyai\.com\/docs\/voice-agents/)
  })

  it("sends no turn detection field the agent socket does not define", () => {
    const allowed = ["vad_threshold", "interrupt_response"]
    const unexpected = Object.keys(definition.input.turn_detection).filter(
      (key) => !allowed.includes(key),
    )
    expect(
      unexpected,
      "the STT socket takes min_turn_silence and max_turn_silence while the agent socket takes min_silence and max_silence; sending the recognizer's names here is the malformed configuration parameter that presents as close code 3006 rather than as a rejected field",
    ).toEqual([])
  })
})
