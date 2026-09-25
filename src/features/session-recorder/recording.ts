import { AGENT_SAMPLE_RATE, decodeBase64, STT_SAMPLE_RATE } from "@/audio/resample"
import { concatBytes, wavDataUri } from "@/audio/wav"
import {
  type AudioMark,
  type FieldCandidate,
  type GateDecision,
  type LatencySample,
  LIVE_RECORDING_SCHEMA,
  type LiveOrderSnapshot,
  type LiveRecording,
  type RecordedFrame,
  type RecordedState,
} from "@/domain"
import type { TappedFrame } from "@/realtime/frame-tap"

export type Recording = {
  frame: (frame: TappedFrame) => void
  callerAudio: (bytes: Uint8Array) => void
  agentAudio: (base64: string) => void
  state: (state: {
    candidates: readonly FieldCandidate[]
    decisions: readonly GateDecision[]
    snapshot: LiveOrderSnapshot | null
  }) => void
  callerPcm: () => Uint8Array
  counts: () => { frames: number; callerBytes: number; agentBytes: number }
  export: (input: {
    sessionId: string | null
    sttModel: string | null
    latency: readonly LatencySample[]
    recordedAt: string
  }) => LiveRecording
  reset: () => void
}

type Track = { chunks: Uint8Array[]; marks: AudioMark[]; bytes: number }

function emptyTrack(): Track {
  return { chunks: [], marks: [], bytes: 0 }
}

export function createRecording(now: () => number = Date.now): Recording {
  let origin: number | null = null
  let frames: RecordedFrame[] = []
  let states: RecordedState[] = []
  let caller = emptyTrack()
  let agent = emptyTrack()

  const relative = (atMs: number): number => {
    origin ??= atMs
    return atMs - origin
  }

  const append = (track: Track, bytes: Uint8Array) => {
    track.marks.push({ atMs: relative(now()), byteOffset: track.bytes })
    track.chunks.push(bytes)
    track.bytes += bytes.byteLength
  }

  return {
    frame: (frame) => {
      frames.push({
        socket: frame.socket,
        direction: frame.direction,
        atMs: relative(frame.atMs),
        frame: frame.frame,
      })
    },
    callerAudio: (bytes) => append(caller, bytes.slice()),
    agentAudio: (base64) => append(agent, decodeBase64(base64)),
    state: (state) => {
      states.push({ atMs: relative(now()), ...state })
    },
    callerPcm: () => concatBytes(caller.chunks),
    counts: () => ({
      frames: frames.length,
      callerBytes: caller.bytes,
      agentBytes: agent.bytes,
    }),
    export: (input) => ({
      schema: LIVE_RECORDING_SCHEMA,
      recordedAt: input.recordedAt,
      sessionId: input.sessionId,
      sttModel: input.sttModel,
      frames: [...frames],
      states: [...states],
      latency: [...input.latency],
      audio: {
        caller: wavDataUri(concatBytes(caller.chunks), STT_SAMPLE_RATE),
        agent: wavDataUri(concatBytes(agent.chunks), AGENT_SAMPLE_RATE),
        callerMarks: [...caller.marks],
        agentMarks: [...agent.marks],
      },
    }),
    reset: () => {
      origin = null
      frames = []
      states = []
      caller = emptyTrack()
      agent = emptyTrack()
    },
  }
}

export function recordingFileName(recordedAt: string): string {
  return `live-${recordedAt.replace(/[:.]/g, "-")}.json`
}
