import { type RefObject, useCallback, useEffect, useRef } from "react"

export const PLAY_CONTROL = 0
export const STOP_CONTROL = 2

export type ControlFocus = {
  readonly controls: RefObject<HTMLDivElement | null>
  readonly hold: (index: number) => void
}

export function useControlFocus(running: boolean): ControlFocus {
  const controls = useRef<HTMLDivElement | null>(null)
  const pending = useRef<number | null>(null)

  const hold = useCallback((index: number) => {
    const root = controls.current
    const active = globalThis.document?.activeElement ?? null
    if (root !== null && active !== null && root.contains(active)) {
      pending.current = index
    }
  }, [])

  useEffect(() => {
    const index = pending.current
    if (index === null) {
      return
    }
    pending.current = null
    const target = controls.current?.querySelectorAll("button")[index]
    if (running === (index === STOP_CONTROL)) {
      target?.focus()
    }
  }, [running])

  return { controls, hold }
}
