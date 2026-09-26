import { type CSSProperties, useEffect, useRef, useState } from "react"
import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { MicState } from "../mic-state"
import styles from "./styles.module.css"

export const BAR_COUNT = 40

export const REST_LEVEL = 0.22

const REST = REST_LEVEL

const BAR_INDEXES: readonly number[] = Array.from({ length: BAR_COUNT }, (_, index) => index)

export type LevelMeterProps = {
  readonly level: number
  readonly state: MicState
}

export function shiftHistory(history: readonly number[], level: number): readonly number[] {
  const clamped = Math.min(1, Math.max(0, level))
  return [...history.slice(1), Math.max(REST, clamped)]
}

export function barHeights(history: readonly number[]): readonly number[] {
  const middle = (BAR_COUNT - 1) / 2
  return BAR_INDEXES.map((index) => {
    const distance = Math.abs(index - middle) / middle
    const taper = 1 - distance ** 2 * 0.45
    const sample = history[index] ?? REST
    return Math.max(REST, Math.min(1, sample * taper))
  })
}

export function LevelMeter({ level, state }: LevelMeterProps) {
  const reduced = useReducedMotion()
  const listening = state === MicState.Listening
  const [history, setHistory] = useState<readonly number[]>(() => BAR_INDEXES.map(() => REST))
  const latest = useRef(level)
  latest.current = listening ? level : 0

  useEffect(() => {
    if (!listening) {
      setHistory(BAR_INDEXES.map(() => REST))
      return
    }
    const timer = globalThis.window?.setInterval(() => {
      setHistory((previous) => shiftHistory(previous, latest.current))
    }, 60)
    return () => {
      if (timer !== undefined) {
        globalThis.window?.clearInterval(timer)
      }
    }
  }, [listening])

  const heights = barHeights(history)
  const speaking = state === MicState.AgentSpeaking
  const tone = listening ? styles.live : speaking ? styles.speaking : styles.quiet
  const classes = [styles.meter, tone].join(" ")

  return (
    <div
      className={classes}
      role="img"
      aria-label={
        listening
          ? `Microphone input level ${Math.round(level * 100)} of 100`
          : speaking
            ? "Microphone held closed while the agent speaks"
            : "Microphone input level, no signal"
      }
    >
      {heights.map((height, index) => (
        <span
          key={`bar-${BAR_INDEXES[index]}`}
          className={styles.bar}
          style={
            {
              "--i": index,
              ...(reduced ? {} : { "--bar-level": height.toFixed(3) }),
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
