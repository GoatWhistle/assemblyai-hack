import type {
  FieldCandidate,
  GateDecision,
  LiveOrderSnapshot,
  LiveRecording,
  RecordedState,
} from "@/domain"
import type { ReplayLine } from "@/features/judge-demo/replay-voice/replay-script"

const LINE_HOLD_MS = 4000

type Spoken = { readonly who: ReplayLine["who"]; readonly atMs: number; readonly text: string }

function spokenOf(frame: LiveRecording["frames"][number]): Spoken | null {
  if (frame.direction !== "in" || typeof frame.frame !== "object" || frame.frame === null) {
    return null
  }
  const message = frame.frame as Record<string, unknown>
  if (
    frame.socket === "stt" &&
    message.type === "Turn" &&
    message.end_of_turn === true &&
    typeof message.transcript === "string" &&
    message.transcript.trim().length > 0
  ) {
    return { who: "caller", atMs: frame.atMs, text: message.transcript }
  }
  if (
    frame.socket === "agent" &&
    message.type === "transcript.agent" &&
    typeof message.text === "string"
  ) {
    return { who: "agent", atMs: frame.atMs, text: message.text }
  }
  return null
}

export function recordedLines(
  recording: LiveRecording,
  fieldAt: (atMs: number) => ReplayLine["field"],
): readonly ReplayLine[] {
  const spoken = recording.frames
    .map(spokenOf)
    .filter((entry): entry is Spoken => entry !== null)
  return spoken.map((entry, index) => {
    const next = spoken[index + 1]
    const until = Math.min(entry.atMs + LINE_HOLD_MS, next?.atMs ?? Number.POSITIVE_INFINITY)
    return {
      id: `${entry.who}-${index}`,
      who: entry.who,
      atMs: entry.atMs,
      untilMs: until,
      text: entry.text,
      field: entry.who === "agent" ? fieldAt(entry.atMs) : null,
    }
  })
}

export type StateAt = {
  readonly candidates: readonly FieldCandidate[]
  readonly decision: GateDecision | null
  readonly snapshot: LiveOrderSnapshot | null
}

export function stateAt(states: readonly RecordedState[], clockMs: number): StateAt {
  let latest: RecordedState | null = null
  for (const state of states) {
    if (state.atMs <= clockMs) {
      latest = state
    }
  }
  return {
    candidates: latest?.candidates ?? [],
    decision: latest?.decisions[latest.decisions.length - 1] ?? null,
    snapshot: latest?.snapshot ?? null,
  }
}

export function durationOf(recording: LiveRecording): number {
  const last = [
    ...recording.frames.map((frame) => frame.atMs),
    ...recording.states.map((state) => state.atMs),
    ...recording.audio.agentMarks.map((mark) => mark.atMs),
    ...recording.audio.callerMarks.map((mark) => mark.atMs),
  ]
  return last.length === 0 ? 0 : Math.max(...last) + LINE_HOLD_MS
}
