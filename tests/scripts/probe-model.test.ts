import { describe, expect, it } from "vitest"
import {
  modelFromArgs,
  modelVerdict,
  PROBE_CANDIDATE_MODEL,
  probeSocketUrl,
} from "../../scripts/report/probe-model"

describe("T2: the model probe is prepared, parameterised and never run by a test", () => {
  it("puts the requested model on the streaming URL", () => {
    const url = new URL(probeSocketUrl("t", PROBE_CANDIDATE_MODEL))
    expect(url.searchParams.get("speech_model")).toBe("universal-3-6-pro")
    expect(new URL(probeSocketUrl("t", null)).searchParams.has("speech_model")).toBe(false)
  })

  it("reads --model from the command line", () => {
    expect(modelFromArgs(["node", "probe", "6", "--model", "universal-3-6-pro"])).toBe(
      "universal-3-6-pro",
    )
    expect(modelFromArgs(["node", "probe"])).toBeNull()
  })

  it("separates accepted, substituted, rejected and inconclusive", () => {
    const requested = PROBE_CANDIDATE_MODEL
    expect(
      modelVerdict({ requested, reported: requested, sawBegin: true, closeCode: 1000 }),
    ).toBe("accepted")
    expect(
      modelVerdict({
        requested,
        reported: "universal-3-5-pro",
        sawBegin: true,
        closeCode: 1000,
      }),
    ).toBe("substituted")
    expect(modelVerdict({ requested, reported: null, sawBegin: false, closeCode: 3006 })).toBe(
      "rejected",
    )
    expect(modelVerdict({ requested, reported: null, sawBegin: true, closeCode: 1000 })).toBe(
      "inconclusive",
    )
  })
})
