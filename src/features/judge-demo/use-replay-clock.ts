import { useCallback, useEffect, useRef, useState } from "react"
import { DEMO_DURATION_MS, REPLAY_FROM_MS } from "./replay-clock"

const TICK_MS = 100

export type ReplayMode = "rest" | "running" | "paused" | "ended"

export type ReplayClock = {
  readonly sessionMs: number
  readonly mode: ReplayMode
  readonly start: () => void
  readonly pause: () => void
  readonly resume: () => void
  readonly rewind: () => void
  readonly settle: () => void
  readonly halt: () => void
}

export function useReplayClock(onEnd: () => void): ReplayClock {
  const [sessionMs, setSessionMs] = useState(REPLAY_FROM_MS)
  const [mode, setMode] = useState<ReplayMode>("rest")
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const ended = useRef(onEnd)
  ended.current = onEnd

  const halt = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const run = useCallback(() => {
    halt()
    setMode("running")
    timer.current = setInterval(() => {
      setSessionMs((previous) => {
        const next = previous + TICK_MS
        if (next >= DEMO_DURATION_MS) {
          halt()
          setMode("ended")
          ended.current()
          return DEMO_DURATION_MS
        }
        return next
      })
    }, TICK_MS)
  }, [halt])

  const start = useCallback(() => {
    setSessionMs(REPLAY_FROM_MS)
    run()
  }, [run])

  const pause = useCallback(() => {
    halt()
    setMode("paused")
  }, [halt])

  const rewind = useCallback(() => {
    halt()
    setSessionMs(REPLAY_FROM_MS)
    setMode("ended")
  }, [halt])

  const settle = useCallback(() => {
    halt()
    setSessionMs(DEMO_DURATION_MS)
    setMode("ended")
  }, [halt])

  useEffect(() => halt, [halt])

  return { sessionMs, mode, start, pause, resume: run, rewind, settle, halt }
}
