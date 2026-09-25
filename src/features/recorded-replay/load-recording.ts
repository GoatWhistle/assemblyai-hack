import type { LiveRecording } from "@/domain"
import { readRecording } from "@/features/session-recorder/live-recording"

const PUBLISHED_RECORDING_PATH = "/replay/live-recording.json"

export type RecordingLoad =
  | { readonly state: "absent" }
  | { readonly state: "failed"; readonly message: string }
  | { readonly state: "loaded"; readonly recording: LiveRecording }

export async function loadPublishedRecording(): Promise<RecordingLoad> {
  let response: Response
  try {
    response = await fetch(PUBLISHED_RECORDING_PATH, { cache: "no-store" })
  } catch {
    return { state: "failed", message: "the published recording could not be fetched" }
  }
  if (response.status === 404) {
    return { state: "absent" }
  }
  if (!response.ok) {
    return {
      state: "failed",
      message: `the published recording answered HTTP ${response.status}`,
    }
  }
  try {
    const recording = readRecording(await response.json())
    return recording === null
      ? {
          state: "failed",
          message: "the published file is not a recording in the expected format",
        }
      : { state: "loaded", recording }
  } catch {
    return { state: "failed", message: "the published recording is not valid JSON" }
  }
}
