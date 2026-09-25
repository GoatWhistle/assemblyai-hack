import { describe, expect, it } from "vitest"
import { LIVE_RECORDING_SCHEMA, STT_MODEL } from "@/domain"
import { createRecording } from "@/features/session-recorder/recording"
import {
  liveRecordingSchema,
  smokeLiveRecording,
  smokeLiveRecordings,
} from "../../scripts/fixtures/live-recording"

function recording(overrides: Record<string, unknown> = {}): {
  frames: unknown[]
  [key: string]: unknown
} {
  return {
    schema: LIVE_RECORDING_SCHEMA,
    recordedAt: "2026-09-27T10:00:00.000Z",
    sessionId: "s",
    sttModel: STT_MODEL,
    frames: [
      {
        socket: "stt",
        direction: "in",
        atMs: 0,
        frame: { type: "Begin", id: "b", configuration: { model: STT_MODEL } },
      },
      {
        socket: "stt",
        direction: "in",
        atMs: 900,
        frame: {
          type: "Turn",
          transcript: "hydromorphone",
          words: [{ text: "hydromorphone", start: 0, end: 500, confidence: 0.97 }],
        },
      },
    ],
    audio: { caller: "data:audio/wav;base64,AAAA", agent: null },
    ...overrides,
  }
}

describe("E3: a recorded live session is accepted into the fixtures only in the agreed shape", () => {
  it("passes a well-formed recording and labels it with its date", () => {
    const smoke = smokeLiveRecording("live-x.json", recording())
    expect(smoke.problems).toEqual([])
    expect(smoke.label).toBe("recorded live on 2026-09-27")
  })

  it("fails a recording whose Begin reported another model", () => {
    const bad = recording()
    bad.frames[0] = {
      socket: "stt",
      direction: "in",
      atMs: 0,
      frame: { type: "Begin", id: "b", configuration: { model: "universal-3-pro" } },
    }
    expect(smokeLiveRecording("f", bad).ok).toBe(false)
  })

  it("fails audio smuggled into the frame log and a missing caller track", () => {
    const bad = recording({ audio: { caller: null, agent: null } })
    bad.frames.push({
      socket: "agent",
      direction: "out",
      atMs: 1,
      frame: { type: "input.audio" },
    })
    const smoke = smokeLiveRecording("f", bad)
    expect(smoke.problems).toHaveLength(2)
  })

  it("fails a file in another schema rather than skipping it", () => {
    expect(smokeLiveRecording("f", { schema: "other" }).ok).toBe(false)
  })

  it("finds no live recording in the fixtures yet, and says so rather than passing silently", () => {
    expect(smokeLiveRecordings()).toEqual([])
  })
})

describe("the smoke reads what the browser recorder writes", () => {
  it("parses a recording exported by the product recorder", () => {
    const recorder = createRecording(() => 1000)
    recorder.frame({
      socket: "stt",
      direction: "in",
      atMs: 1000,
      type: "Begin",
      frame: { type: "Begin", configuration: { model: STT_MODEL } },
    })
    recorder.callerAudio(new Uint8Array(3200))
    const exported = recorder.export({
      sessionId: "srv-1",
      sttModel: STT_MODEL,
      latency: [],
      recordedAt: "2026-09-27T10:00:00.000Z",
    })
    expect(liveRecordingSchema.safeParse(exported).success).toBe(true)
    expect(smokeLiveRecording("live-x.json", exported).problems).toEqual([
      "no streaming Turn frame was recorded",
    ])
  })
})
