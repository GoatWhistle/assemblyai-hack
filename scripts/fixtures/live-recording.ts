import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { z } from "zod"
import {
  LIVE_RECORDING_SCHEMA,
  type LiveRecording,
  type RecordedFrame,
  STT_MODEL,
} from "@/domain"

const LIVE_FIXTURE_DIR = "eval/fixtures"

type SmokedFrame = Omit<RecordedFrame, "frame"> & { readonly frame?: RecordedFrame["frame"] }

export type SmokedRecording = Pick<
  LiveRecording,
  "schema" | "recordedAt" | "sessionId" | "sttModel"
> & {
  readonly frames: readonly SmokedFrame[]
  readonly audio: Pick<LiveRecording["audio"], "caller" | "agent">
}

const frameSchema = z.object({
  socket: z.enum(["stt", "agent"]),
  direction: z.enum(["in", "out"]),
  atMs: z.number(),
  frame: z.unknown(),
})

export const liveRecordingSchema = z.object({
  schema: z.literal(LIVE_RECORDING_SCHEMA),
  recordedAt: z.string(),
  sessionId: z.string().nullable(),
  sttModel: z.string().nullable(),
  frames: z.array(frameSchema),
  audio: z.object({ caller: z.string().nullable(), agent: z.string().nullable() }),
}) satisfies z.ZodType<SmokedRecording>

export type LiveSmoke = {
  readonly file: string
  readonly ok: boolean
  readonly problems: readonly string[]
  readonly label: string
}

type TurnWord = { readonly confidence?: unknown }

type SttFrame = {
  readonly type?: unknown
  readonly words?: readonly TurnWord[]
  readonly configuration?: { readonly model?: unknown }
}

function sttFrames(recording: SmokedRecording): readonly SttFrame[] {
  return recording.frames
    .filter((entry) => entry.socket === "stt" && entry.direction === "in")
    .map(
      (entry) =>
        (typeof entry.frame === "object" && entry.frame !== null
          ? entry.frame
          : {}) as SttFrame,
    )
}

function recordingLabel(recording: Pick<LiveRecording, "recordedAt">): string {
  return `recorded live on ${recording.recordedAt.slice(0, 10)}`
}

export function smokeLiveRecording(file: string, raw: unknown): LiveSmoke {
  const parsed = liveRecordingSchema.safeParse(raw)
  if (!parsed.success) {
    return { file, ok: false, problems: [`not a ${LIVE_RECORDING_SCHEMA} file`], label: "" }
  }
  const recording = parsed.data
  const problems: string[] = []
  const frames = sttFrames(recording)
  const begin = frames.find((frame) => frame.type === "Begin")
  const model =
    typeof begin?.configuration?.model === "string" ? begin.configuration.model : null
  if (model !== STT_MODEL) {
    problems.push(`Begin reported model ${model ?? "(none)"}, expected ${STT_MODEL}`)
  }
  const turns = frames.filter((frame) => frame.type === "Turn")
  if (turns.length === 0) {
    problems.push("no streaming Turn frame was recorded")
  }
  const unscored = turns.some((turn) =>
    (turn.words ?? []).some((word) => {
      const confidence = Number(word.confidence)
      return !Number.isFinite(confidence) || confidence < 0 || confidence > 1
    }),
  )
  if (unscored) {
    problems.push("a recorded word carries no usable confidence")
  }
  const audioInFrames = recording.frames.some((entry) => {
    const type = (entry.frame as { type?: unknown } | null)?.type
    return type === "input.audio" || type === "reply.audio"
  })
  if (audioInFrames) {
    problems.push(
      "audio appears inside frames; audio belongs in audio.caller and audio.agent only",
    )
  }
  if (recording.audio.caller === null) {
    problems.push("no caller audio was exported, so the replay cannot play real sound")
  }
  return { file, ok: problems.length === 0, problems, label: recordingLabel(recording) }
}

function liveRecordingFiles(dir = LIVE_FIXTURE_DIR): readonly string[] {
  return readdirSync(resolve(dir))
    .filter((name) => /^live-.*\.json$/.test(name))
    .map((name) => join(dir, name))
}

export function smokeLiveRecordings(dir = LIVE_FIXTURE_DIR): readonly LiveSmoke[] {
  return liveRecordingFiles(dir).map((file) =>
    smokeLiveRecording(file, JSON.parse(readFileSync(resolve(file), "utf8"))),
  )
}
