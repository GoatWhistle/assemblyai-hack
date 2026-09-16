import { describe, expect, it, vi } from "vitest"
import { FixturePlayer, fixtureDurationMs } from "@/realtime/fixture-player"
import type { AgentMessage, SessionFixture, SttMessage } from "@/realtime/protocol"
import { isSttTurn } from "@/realtime/protocol"
import fixture from "../fixtures/lasa-lisinopril.json" with { type: "json" }

const SESSION = fixture as SessionFixture

describe("the development fixture", () => {
  it("conforms to SessionFixture and carries frames on both sockets", () => {
    expect(SESSION.sessionId).toBe("fixture-lasa-001")
    expect(SESSION.frames.length).toBeGreaterThan(5)
    expect(SESSION.frames.some((frame) => frame.socket === "stt")).toBe(true)
    expect(SESSION.frames.some((frame) => frame.socket === "agent")).toBe(true)
  })

  it("carries the high-certainty wrong drug that the product exists to catch", () => {
    const turn = SESSION.frames
      .map((frame) => frame.message)
      .filter((message): message is SttMessage => "type" in message)
      .find(
        (message) =>
          isSttTurn(message as SttMessage) &&
          (message as { transcript: string }).transcript.includes("Bisoprolol"),
      )
    expect(turn).toBeDefined()
    const words = (turn as { words: { text: string; confidence: number }[] }).words
    const drug = words.find((word) => word.text === "Bisoprolol")
    expect(drug?.confidence).toBeGreaterThanOrEqual(0.95)
  })

  it("ends with both sockets confirming their close", () => {
    const types = SESSION.frames.map((frame) => frame.message.type)
    expect(types).toContain("session.ended")
    expect(types).toContain("Termination")
  })
})

describe("FixturePlayer", () => {
  it("replays every inbound frame to the socket it belongs to", () => {
    const stt: SttMessage[] = []
    const agent: AgentMessage[] = []
    const player = new FixturePlayer(SESSION, {
      events: {
        onSttMessage: (message) => stt.push(message),
        onAgentMessage: (message) => agent.push(message),
      },
    })
    player.drainSync()
    expect(stt.length).toBeGreaterThan(0)
    expect(agent.length).toBeGreaterThan(0)
    expect(stt.length + agent.length).toBe(SESSION.frames.length)
  })

  it("reports the fixture duration from the last frame", () => {
    expect(fixtureDurationMs(SESSION)).toBe(18600)
    expect(new FixturePlayer(SESSION).totalMs).toBe(18600)
  })

  it("schedules frames at their original relative timings", () => {
    const delays: number[] = []
    const player = new FixturePlayer(SESSION, {
      scheduler: (callback, delayMs) => {
        delays.push(delayMs)
        callback()
        return () => undefined
      },
    })
    player.start()
    expect(delays[0]).toBe(0)
    expect(delays.at(-1)).toBe(18600)
    expect([...delays].sort((a, b) => a - b)).toEqual(delays)
  })

  it("compresses the timeline when a speed is given", () => {
    const delays: number[] = []
    new FixturePlayer(SESSION, {
      speed: 2,
      scheduler: (callback, delayMs) => {
        delays.push(delayMs)
        callback()
        return () => undefined
      },
    }).start()
    expect(delays.at(-1)).toBe(9300)
  })

  it("reports done once the last frame has played", () => {
    const done = vi.fn()
    new FixturePlayer(SESSION, {
      events: { onDone: done },
      scheduler: (callback) => {
        callback()
        return () => undefined
      },
    }).start()
    expect(done).toHaveBeenCalledOnce()
  })

  it("cancels every pending frame on stop", () => {
    const cancels: number[] = []
    const player = new FixturePlayer(SESSION, {
      scheduler: (_callback, _delayMs) => () => cancels.push(1),
    })
    player.start()
    player.stop()
    expect(cancels.length).toBe(SESSION.frames.length)
    expect(player.isRunning).toBe(false)
  })

  it("reports done immediately for an empty fixture rather than hanging", () => {
    const done = vi.fn()
    new FixturePlayer({ ...SESSION, frames: [] }, { events: { onDone: done } }).start()
    expect(done).toHaveBeenCalledOnce()
  })
})
