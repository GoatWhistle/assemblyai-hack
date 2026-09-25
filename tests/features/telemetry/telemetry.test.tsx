import { describe, expect, it } from "vitest"
import { LatencyInterval } from "@/domain"
import { createLatencyRecorder, percentile } from "@/features/latency/latency-recorder"
import { AgentActivity, agentActivityOf } from "@/features/telemetry/agent-activity"
import { createFrameLog } from "@/features/telemetry/frame-log"
import { modeLabel } from "@/features/telemetry/session-mode"
import { CLOSE_FRAME_TYPE, type TappedFrame } from "@/realtime/frame-tap"

function frame(type: string, socket: "stt" | "agent" = "agent"): TappedFrame {
  return { socket, direction: "in", atMs: 0, type, frame: { type } }
}

describe("the agent's state comes from its own events", () => {
  it("reads speaking, thinking and listening from the last agent event", () => {
    expect(agentActivityOf([])).toBe(AgentActivity.Offline)
    expect(agentActivityOf([frame("session.created")])).toBe(AgentActivity.Listening)
    expect(agentActivityOf([frame("input.speech.stopped")])).toBe(AgentActivity.Thinking)
    expect(agentActivityOf([frame("reply.started"), frame("Turn", "stt")])).toBe(
      AgentActivity.Speaking,
    )
    expect(agentActivityOf([frame("reply.started"), frame("reply.done")])).toBe(
      AgentActivity.Listening,
    )
    expect(agentActivityOf([frame("reply.started"), frame(CLOSE_FRAME_TYPE)])).toBe(
      AgentActivity.Offline,
    )
  })
})

describe("the frame log stays bounded", () => {
  it("keeps the newest frames and counts every one", () => {
    const log = createFrameLog(3)
    let notified = 0
    log.subscribe(() => {
      notified += 1
    })
    for (const type of ["a", "b", "c", "d"]) {
      log.push(frame(type))
    }
    expect(log.snapshot().map((entry) => entry.type)).toEqual(["b", "c", "d"])
    expect(log.total()).toBe(4)
    expect(notified).toBe(4)
  })
})

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
