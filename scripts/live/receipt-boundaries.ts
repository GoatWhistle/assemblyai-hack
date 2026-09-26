import type { RunKind } from "@/domain"

export const ACCEPTANCE_BOUNDARIES: readonly string[] = [
  "one call by one member of the team, not a sample of prescribers",
  "provenance is computed in the browser and posted by it; the server did not hear the audio",
  "the recognizer model is the one the browser reported from Begin, not one the server observed",
]

const PREVIEW_BOUNDARY =
  "a preview deployment, so cold starts and the free-tier session limit may differ from production"

const PREVIEW_HOST_MARKERS: readonly string[] = [
  "-git-",
  "ngrok",
  "localhost",
  "127.0.0.1",
  "preview",
]

export function deploymentBoundary(deployment: string): string {
  const host = URL.canParse(deployment) ? new URL(deployment).host : deployment
  if (PREVIEW_HOST_MARKERS.some((marker) => host.includes(marker))) {
    return PREVIEW_BOUNDARY
  }
  return `the deployment at ${host}, so cold starts and session limits are those of that deployment on the day of the run, not a measurement of any other`
}

export const LIVE_SMOKE_BOUNDARY =
  "the caller is synthesised speech, prepared lines injected into the page through WebAudio by an automated harness after each agent reply; no human spoke and no microphone was used"

export function boundariesFor(kind: RunKind, deployment: string): readonly string[] {
  const shared = [...ACCEPTANCE_BOUNDARIES.slice(1), deploymentBoundary(deployment)]
  if (kind !== "live_smoke") {
    return [ACCEPTANCE_BOUNDARIES[0] ?? "", ...shared]
  }
  return [LIVE_SMOKE_BOUNDARY, ...shared]
}
