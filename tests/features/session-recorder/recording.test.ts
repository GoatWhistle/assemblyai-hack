import { describe, expect, it } from "vitest"
import { encodeBase64 } from "@/audio/resample"
import { pcm16Wav, pcmSlice } from "@/audio/wav"
import { LIVE_RECORDING_SCHEMA } from "@/domain"
import { createRecording, recordingFileName } from "@/features/session-recorder/recording"
import { recorderRequested } from "@/features/session-recorder/use-session-recorder"

describe("E3: the development recorder", () => {
  it("is off in production whatever the URL says, and on only when asked in development", () => {
    expect(recorderRequested("?record=1", "production")).toBe(false)
    expect(recorderRequested("?record=1", "development")).toBe(true)
    expect(recorderRequested("", "development")).toBe(false)
  })

  it("exports both sockets' frames on a relative clock, and each voice as its own WAV", () => {
    const recording = createRecording()
    recording.frame({
      socket: "stt",
      direction: "in",
      atMs: 5000,
      type: "Begin",
      frame: { type: "Begin" },
    })
    recording.frame({
      socket: "agent",
      direction: "out",
      atMs: 5250,
      type: "session.update",
      frame: { type: "session.update" },
    })
    recording.callerAudio(new Uint8Array(3200))
    recording.agentAudio(encodeBase64(new Uint8Array(4800)))
    const exported = recording.export({
      sessionId: "srv-1",
      sttModel: "universal-3-5-pro",
      latency: [],
      recordedAt: "2026-09-27T10:00:00.000Z",
    })
    expect(exported.schema).toBe(LIVE_RECORDING_SCHEMA)
    expect(exported.frames.map((frame) => [frame.socket, frame.atMs])).toEqual([
      ["stt", 0],
      ["agent", 250],
    ])
    expect(exported.audio.caller?.startsWith("data:audio/wav;base64,")).toBe(true)
    expect(exported.audio.agent?.startsWith("data:audio/wav;base64,")).toBe(true)
    expect(JSON.stringify(exported.frames)).not.toMatch(/input\.audio|reply\.audio/)
    expect(recordingFileName(exported.recordedAt)).toBe("live-2026-09-27T10-00-00-000Z.json")
  })

  it("leaves a voice out rather than exporting an empty file", () => {
    const exported = createRecording().export({
      sessionId: null,
      sttModel: null,
      latency: [],
      recordedAt: "2026-09-27T10:00:00.000Z",
    })
    expect(exported.audio).toEqual({
      caller: null,
      agent: null,
      callerMarks: [],
      agentMarks: [],
    })
  })
})

describe("the WAV writer and the segment cutter", () => {
  it("writes a 44-byte PCM header with the right rate", () => {
    const wav = pcm16Wav(new Uint8Array(32), 16000)
    const view = new DataView(wav.buffer)
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF")
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(40, true)).toBe(32)
    expect(wav.byteLength).toBe(76)
  })

  it("cuts a segment by milliseconds on sample boundaries", () => {
    const pcm = new Uint8Array(32000)
    expect(pcmSlice(pcm, 16000, 100, 200).byteLength).toBe(3200)
    expect(pcmSlice(pcm, 16000, 900, 2000).byteLength).toBe(3200)
    expect(pcmSlice(pcm, 16000, 500, 400).byteLength).toBe(0)
  })
})
