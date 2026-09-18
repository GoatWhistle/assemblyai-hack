import { describe, expect, it } from "vitest"
import { FIELD_NAMES, FieldName } from "@/domain"
import {
  AGENT_PATCH_OMITS,
  agentPatiencePatch,
  DEFAULT_PATIENCE,
  PATIENCE,
  PATIENCE_BY_FIELD,
  PatienceName,
  patienceFor,
  sttPatiencePatch,
} from "@/realtime/patience"

describe("the patience table cannot hold a preset that closes the turn before it opens", () => {
  for (const [name, preset] of Object.entries(PATIENCE)) {
    it(`keeps min_silence strictly below max_silence in the ${name} preset`, () => {
      expect(
        preset.minSilence,
        "a preset whose floor meets its ceiling has no window in which a turn can end normally",
      ).toBeLessThan(preset.maxSilence)
    })

    it(`keeps the ${name} preset inside the documented ranges`, () => {
      expect(preset.minSilence).toBeGreaterThanOrEqual(50)
      expect(preset.minSilence).toBeLessThanOrEqual(10_000)
      expect(preset.maxSilence).toBeLessThanOrEqual(10_000)
      expect(preset.vadThreshold).toBeGreaterThan(0)
      expect(preset.vadThreshold).toBeLessThanOrEqual(1)
    })

    it(`states why the ${name} preset exists rather than leaving a number unexplained`, () => {
      expect(preset.why.length).toBeGreaterThan(40)
      expect(preset.name).toBe(name)
    })
  }
})

describe("every field decides its own patience", () => {
  it("assigns a preset to each field in the policy table, so a new field cannot be silent", () => {
    for (const field of FIELD_NAMES) {
      expect(PATIENCE_BY_FIELD[field], `${field} has no patience preset`).toBeDefined()
      expect(PATIENCE[PATIENCE_BY_FIELD[field]]).toBeDefined()
    }
  })

  it("waits longest on the two dictated identifiers, which arrive in digit groups", () => {
    const npi = patienceFor(FieldName.PrescriberNpi)
    const dea = patienceFor(FieldName.PrescriberDea)
    expect(npi.name).toBe(PatienceName.Dictated)
    expect(dea.name).toBe(PatienceName.Dictated)
    for (const other of Object.values(PATIENCE)) {
      expect(npi.minSilence).toBeGreaterThanOrEqual(other.minSilence)
    }
  })

  it("is snappier on a one-word field than on a nine-digit one", () => {
    expect(patienceFor(FieldName.Route).minSilence).toBeLessThan(
      patienceFor(FieldName.PrescriberNpi).minSilence,
    )
  })

  it("collapses to the terse preset while a confirmation is outstanding, whatever the field", () => {
    const confirming = patienceFor(FieldName.PrescriberNpi, true)
    expect(
      confirming.name,
      "a spoken yes is one word; waiting out the dictation timeout after it spends the whole latency budget",
    ).toBe(PatienceName.Terse)
    expect(confirming.minSilence).toBeLessThan(patienceFor(FieldName.PrescriberNpi).minSilence)
  })

  it("falls back to the stored agent's own default when nothing is being solicited", () => {
    expect(patienceFor(null).name).toBe(DEFAULT_PATIENCE)
  })
})

describe("the patch shapes name the parameters each socket documents", () => {
  it("sends the streaming names on the recognizer socket", () => {
    const patch = sttPatiencePatch(PATIENCE[PatienceName.Dictated])
    expect(Object.keys(patch).sort()).toEqual([
      "max_turn_silence",
      "min_turn_silence",
      "vad_threshold",
    ])
    expect(patch.min_turn_silence).toBeLessThan(patch.max_turn_silence ?? 0)
  })

  it("nests the agent names under turn_detection, which is where the agent reads them", () => {
    const patch = agentPatiencePatch(PATIENCE[PatienceName.Terse])
    expect(patch).toEqual({ turn_detection: { vad_threshold: 0.65 } })
  })

  it("sends the agent neither silence bound, because either one disables entity-aware waiting", () => {
    for (const name of Object.values(PatienceName)) {
      const nested = (
        agentPatiencePatch(PATIENCE[name]) as {
          turn_detection: Record<string, unknown>
        }
      ).turn_detection
      for (const field of ["min_silence", "max_silence"]) {
        expect(
          Object.hasOwn(nested, field),
          `patching ${field} on the live agent socket re-triggers the disabling the stored definition avoids, and it would happen on the first field switch of every call. Entity-aware waiting is what holds a turn through a dictated NPI, which is the one place a truncation costs us a checksum failure on a value nobody mis-said`,
        ).toBe(false)
      }
    }
  })

  it("keeps sending the recognizer both bounds, because there they widen the window", () => {
    const patch = sttPatiencePatch(PATIENCE[PatienceName.Dictated])
    expect(
      patch.min_turn_silence,
      "the two sockets are opposite: raising the recognizer floor is how a dictated entity gets a wider window, so removing these would be the wrong half of the same lesson",
    ).toBeGreaterThan(0)
    expect(patch.max_turn_silence).toBeGreaterThan(0)
  })

  it("records why the agent patch is narrower than the recognizer patch", () => {
    expect(
      AGENT_PATCH_OMITS,
      "a patch that quietly omits two fields reads as an oversight; the reason has to travel with it or the next person tuning latency puts them back",
    ).toMatch(/entity-aware waiting/)
  })
})
