export const REPLAY_FROM_MS = 5000
export const DECISION_AT_MS = 9600
export const DEMO_DURATION_MS = 18600
export const REPLAY_LENGTH_MS = DEMO_DURATION_MS - REPLAY_FROM_MS
export const REPLAY_SECONDS = Math.round(REPLAY_LENGTH_MS / 1000)
export const REPLAY_LENGTH_LABEL = `${REPLAY_SECONDS}-second replay`

export function sessionSeconds(sessionMs: number): string {
  return `${(sessionMs / 1000).toFixed(1)}s`
}
