export type ReplyMeasure = {
  readonly playedMs: number
  readonly durationMs: number
}

type Interval = {
  readonly start: number
  readonly end: number
}

export type ReplyClock = {
  begin: () => void
  schedule: (startSeconds: number, durationSeconds: number) => void
  stopAt: (nowSeconds: number) => void
  measure: (nowSeconds: number) => ReplyMeasure
  finishesAt: () => number
  readonly stopped: boolean
}

export function createReplyClock(): ReplyClock {
  let intervals: Interval[] = []
  let stoppedAt: number | null = null

  return {
    get stopped() {
      return stoppedAt !== null
    },
    begin: () => {
      intervals = []
      stoppedAt = null
    },
    schedule: (startSeconds, durationSeconds) => {
      if (stoppedAt !== null || durationSeconds <= 0) {
        return
      }
      intervals.push({ start: startSeconds, end: startSeconds + durationSeconds })
    },
    stopAt: (nowSeconds) => {
      if (stoppedAt === null) {
        stoppedAt = nowSeconds
      }
    },
    measure: (nowSeconds) => {
      const horizon = stoppedAt ?? nowSeconds
      let played = 0
      let duration = 0
      for (const interval of intervals) {
        duration += interval.end - interval.start
        played += Math.max(0, Math.min(horizon, interval.end) - interval.start)
      }
      return {
        playedMs: Math.round(played * 1000),
        durationMs: Math.round(duration * 1000),
      }
    },
    finishesAt: () => intervals.reduce((latest, interval) => Math.max(latest, interval.end), 0),
  }
}
