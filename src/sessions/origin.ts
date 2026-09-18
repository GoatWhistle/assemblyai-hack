export const SessionOrigin = {
  Live: "live",
  DemoRehearsal: "demo_rehearsal",
  Measurement: "measurement",
} as const

export type SessionOrigin = (typeof SessionOrigin)[keyof typeof SessionOrigin]

const PREFIX_BY_ORIGIN: Readonly<Record<SessionOrigin, string>> = Object.freeze({
  [SessionOrigin.Live]: "sessions/live",
  [SessionOrigin.DemoRehearsal]: "sessions/rehearsal",
  [SessionOrigin.Measurement]: "sessions/measurement",
})

export const SESSION_ORIGIN_SEPARATION_NOTE =
  "a demo rehearsal and a measured session are stored under different prefixes so a rehearsal can never be counted into a published figure; the origin is recorded at write time and the reader filters on it rather than on a naming convention"

function isSessionOrigin(value: unknown): value is SessionOrigin {
  return (
    value === SessionOrigin.Live ||
    value === SessionOrigin.DemoRehearsal ||
    value === SessionOrigin.Measurement
  )
}

export function sessionOriginOf(value: unknown): SessionOrigin {
  return isSessionOrigin(value) ? value : SessionOrigin.Live
}

export function storagePrefixFor(origin: SessionOrigin): string {
  return PREFIX_BY_ORIGIN[origin]
}

export const ALL_SESSION_ORIGINS: readonly SessionOrigin[] = Object.freeze([
  SessionOrigin.Live,
  SessionOrigin.DemoRehearsal,
  SessionOrigin.Measurement,
])

export function originFromEnv(env: Record<string, string | undefined>): SessionOrigin {
  return sessionOriginOf(env.READBACK_SESSION_ORIGIN)
}

export function countsTowardPublishedMetrics(origin: SessionOrigin): boolean {
  return origin === SessionOrigin.Measurement
}
