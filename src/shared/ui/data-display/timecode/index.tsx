import styles from "./styles.module.css"

function formatTimecode(ms: number): string {
  const safe = Math.max(0, Math.round(ms))
  const minutes = Math.floor(safe / 60000)
  const seconds = ((safe % 60000) / 1000).toFixed(2).padStart(5, "0")
  return `${minutes}:${seconds}`
}

export type TimecodeProps = {
  readonly startMs: number
  readonly endMs?: number
}

export function Timecode({ startMs, endMs }: TimecodeProps) {
  const label =
    endMs === undefined
      ? formatTimecode(startMs)
      : `${formatTimecode(startMs)}–${formatTimecode(endMs)}`
  return <span className={styles.timecode}>{label}</span>
}
