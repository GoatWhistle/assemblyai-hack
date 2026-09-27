import { describe, expect, it } from "vitest"
import { LatencyInterval } from "@/domain"
import { createLatencyRecorder, percentile } from "@/features/latency/latency-recorder"
import { modeLabel } from "@/features/telemetry/session-mode"

describe("E7: latency is measured per turn with n, never invented", () => {
  it("reports nothing until an interval was actually observed", () => {
    const recorder = createLatencyRecorder()
    expect(recorder.summary(LatencyInterval.TurnToAudio)).toMatchObject({ n: 0, p50: null })
  })

  it("pairs a turn with the next agent audio only once", () => {
    const recorder = createLatencyRecorder()
    recorder.turnEnded(3, 1000)
    recorder.agentAudio(1450)
    recorder.agentAudio(1600)
    expect(recorder.samples()).toEqual([
      { interval: LatencyInterval.TurnToAudio, turnOrder: 3, ms: 450 },
    ])
  })

  it("takes p50 and p95 by rank", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(20)
    expect(percentile([10, 20, 30, 40], 0.95)).toBe(40)
    expect(percentile([], 0.5)).toBeNull()
  })
})

describe("the mode badge never calls a replay live", () => {
  it("says which kind of session is on screen", () => {
    expect(modeLabel({ kind: "live" })).toBe("Live: two sockets")
    expect(modeLabel({ kind: "replay", recordedOn: "2026-09-27", source: "live" })).toMatch(
      /recorded live on 2026-09-27/,
    )
    expect(
      modeLabel({ kind: "replay", recordedOn: "2026-09-15", source: "synthesised" }),
    ).toMatch(/synthesised/)
  })
})
