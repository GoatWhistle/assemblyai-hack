import { LIVE_RECORDING_SCHEMA, type LiveRecording } from "@/domain"

export function readRecording(value: unknown): LiveRecording | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const record = value as Partial<LiveRecording>
  if (
    record.schema !== LIVE_RECORDING_SCHEMA ||
    typeof record.recordedAt !== "string" ||
    !Array.isArray(record.frames) ||
    !Array.isArray(record.states) ||
    typeof record.audio !== "object" ||
    record.audio === null ||
    !Array.isArray(record.audio.callerMarks) ||
    !Array.isArray(record.audio.agentMarks)
  ) {
    return null
  }
  return record as LiveRecording
}
