import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { encodeBase64 } from "@/audio/resample"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"
import { loadPublishedRecording } from "@/features/recorded-replay/load-recording"
import { chunksOf, pcmOfDataUri } from "@/features/recorded-replay/recorded-audio"
import { RecordedPlayer } from "@/features/recorded-replay/recorded-player"
import { createRecording } from "@/features/session-recorder/recording"

function recording() {
  let clock = 1000
  const rec = createRecording(() => clock)
  rec.frame({
    socket: "stt",
    direction: "in",
    atMs: 1000,
    type: "Begin",
    frame: { type: "Begin" },
  })
  clock = 1200
  rec.callerAudio(new Uint8Array(6400))
  rec.frame({
    socket: "stt",
    direction: "in",
    atMs: 3000,
    type: "Turn",
    frame: { type: "Turn", end_of_turn: true, transcript: "Hydromorphone two milligrams." },
  })
  clock = 3500
  rec.state({
    candidates: [LASA_CANDIDATE],
    decisions: [LASA_DECISION],
    snapshot: {
      orderId: "o",
      referenceNumber: "ABC123",
      status: "in_progress",
      confirmedFields: [],
      abortedFields: [],
      confirmations: [],
      commitRefusals: [],
      awaitingConfirmation: { field: LASA_CANDIDATE.field, candidateId: "c", sinceMs: 0 },
      actualModel: "universal-3-5-pro",
    },
  })
  clock = 4000
  rec.agentAudio(encodeBase64(new Uint8Array(4800)))
  rec.frame({
    socket: "agent",
    direction: "in",
    atMs: 4000,
    type: "transcript.agent",
    frame: { type: "transcript.agent", text: "Did you say morphine or hydromorphone?" },
  })
  return rec.export({
    sessionId: "srv-1",
    sttModel: "universal-3-5-pro",
    latency: [],
    recordedAt: "2026-09-27T10:00:00.000Z",
  })
}

let clockMs = 0

beforeEach(() => {
  vi.useFakeTimers()
  clockMs = 0
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("U2 and E3: a published live recording replays with its own audio", () => {
  it("plays the recording and moves captions, highlight and verdict on the audio clock", () => {
    const stop = vi.fn(async () => undefined)
    const play = vi.fn(() => ({ clockMs: () => clockMs, stop }))
    render(<RecordedPlayer recording={recording()} play={play} />)
    expect(screen.getByText("Replay: recorded live on 2026-09-27")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Play the recorded call" }))
    expect(play).toHaveBeenCalledOnce()
    clockMs = 2100
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText(/Hydromorphone two milligrams/)).toBeTruthy()
    expect(screen.getByText("Recorded session replayed through the real gate.")).toBeTruthy()
    clockMs = 3100
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText(/Did you say morphine or hydromorphone/)).toBeTruthy()
    expect(screen.getByText("Reading back: Drug name")).toBeTruthy()
    expect(screen.getAllByText("RE-ASK").length).toBeGreaterThan(0)
  })

  it("cuts each voice's audio at the marks it was recorded with", () => {
    const rec = recording()
    const caller = chunksOf(pcmOfDataUri(rec.audio.caller), rec.audio.callerMarks)
    const agent = chunksOf(pcmOfDataUri(rec.audio.agent), rec.audio.agentMarks)
    expect(caller.map((chunk) => [chunk.atMs, chunk.bytes.byteLength])).toEqual([[200, 6400]])
    expect(agent.map((chunk) => [chunk.atMs, chunk.bytes.byteLength])).toEqual([[3000, 4800]])
  })

  it("reports an unpublished recording as absent rather than as an error", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 404 }),
    ) as unknown as typeof fetch
    expect(await loadPublishedRecording()).toEqual({ state: "absent" })
  })
})
