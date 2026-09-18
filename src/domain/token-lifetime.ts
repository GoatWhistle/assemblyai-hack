export const MIN_EXPIRES_IN_SECONDS = 1
export const MAX_EXPIRES_IN_SECONDS = 600
export const MIN_SESSION_DURATION_SECONDS = 60
export const MAX_SESSION_DURATION_SECONDS = 10800

export const DEFAULT_EXPIRES_IN_SECONDS = 60
export const DEFAULT_SESSION_DURATION_SECONDS = 900

function clampedInteger(raw: string | undefined, fallback: number, low: number, high: number) {
  if (raw === undefined || raw.trim().length === 0) {
    return fallback
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(high, Math.max(low, Math.trunc(parsed)))
}

export type TokenLifetime = {
  readonly expiresInSeconds: number
  readonly maxSessionDurationSeconds: number
}

export function tokenLifetime(env: Record<string, string | undefined>): TokenLifetime {
  return {
    expiresInSeconds: clampedInteger(
      env.TOKEN_EXPIRES_IN_SECONDS,
      DEFAULT_EXPIRES_IN_SECONDS,
      MIN_EXPIRES_IN_SECONDS,
      MAX_EXPIRES_IN_SECONDS,
    ),
    maxSessionDurationSeconds: clampedInteger(
      env.MAX_SESSION_DURATION_SECONDS,
      DEFAULT_SESSION_DURATION_SECONDS,
      MIN_SESSION_DURATION_SECONDS,
      MAX_SESSION_DURATION_SECONDS,
    ),
  }
}
