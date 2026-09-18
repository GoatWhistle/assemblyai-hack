export const RATE_BRAKE_WINDOW_MS = 60_000

export const RATE_BRAKE_MAX_PER_WINDOW = 20

export const RATE_BRAKE_HONESTY_NOTE =
  "this brake counts requests seen by one warm serverless instance; it lowers the probability of a runaway client burning the free tier, it does not enforce a global cap, and a new instance or a different IP resets it"

export type RateBrakeState = {
  windowStartedAtMs: number
  countInWindow: number
}

export function freshRateBrakeState(): RateBrakeState {
  return { windowStartedAtMs: 0, countInWindow: 0 }
}

export type RateBrakeOutcome = {
  readonly allowed: boolean
  readonly countInWindow: number
  readonly retryAfterMs: number
}

export function admitAgainstRateBrake(input: {
  state: RateBrakeState
  nowMs: number
  windowMs?: number
  maxPerWindow?: number
}): RateBrakeOutcome {
  const windowMs = input.windowMs ?? RATE_BRAKE_WINDOW_MS
  const maxPerWindow = input.maxPerWindow ?? RATE_BRAKE_MAX_PER_WINDOW
  const { state, nowMs } = input

  const elapsed = nowMs - state.windowStartedAtMs
  if (elapsed >= windowMs || elapsed < 0) {
    state.windowStartedAtMs = nowMs
    state.countInWindow = 0
  }

  if (state.countInWindow >= maxPerWindow) {
    return {
      allowed: false,
      countInWindow: state.countInWindow,
      retryAfterMs: Math.max(0, windowMs - elapsed),
    }
  }

  state.countInWindow += 1
  return { allowed: true, countInWindow: state.countInWindow, retryAfterMs: 0 }
}
