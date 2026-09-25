"use client"

import { useSyncExternalStore } from "react"
import type { TappedFrame } from "@/realtime/frame-tap"
import type { FrameLog } from "../frame-log"
import styles from "./styles.module.css"

const FEED_ROWS = 40

const NO_FRAMES: readonly TappedFrame[] = []

function detailOf(frame: TappedFrame): string {
  if (typeof frame.frame !== "object" || frame.frame === null) {
    return ""
  }
  const record = frame.frame as Record<string, unknown>
  for (const key of ["transcript", "text", "status", "code", "reply_id"]) {
    const value = record[key]
    if (typeof value === "string" || typeof value === "number") {
      return `${key}: ${String(value).slice(0, 80)}`
    }
  }
  return ""
}

export type FrameFeedProps = {
  readonly log: FrameLog
}

export function FrameFeed({ log }: FrameFeedProps) {
  const frames = useSyncExternalStore(log.subscribe, log.snapshot, () => NO_FRAMES)
  const shown = frames.slice(-FEED_ROWS).reverse()
  return (
    <div className={styles.feed}>
      <p className={styles.caption}>
        Protocol frames on both sockets, newest first, audio omitted. {log.total()} seen.
      </p>
      {shown.length === 0 ? (
        <p className={styles.empty}>No frame has crossed either socket yet.</p>
      ) : (
        <ol className={styles.list} role="log" aria-label="Socket frames">
          {shown.map((frame, index) => (
            <li key={`${frame.atMs}-${index}`} className={styles.frame}>
              <span className={styles.socket}>{frame.socket}</span>
              <span className={styles.direction}>{frame.direction === "in" ? "←" : "→"}</span>
              <span className={styles.type}>{frame.type}</span>
              <span className={styles.detail}>{detailOf(frame)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
