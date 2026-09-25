"use client"

import { useEffect, useState } from "react"
import styles from "./styles.module.css"

export type AnswerWaitProps = {
  readonly sinceMs: number
  readonly now?: () => number
}

export function AnswerWait({ sinceMs, now = Date.now }: AnswerWaitProps) {
  const [current, setCurrent] = useState(() => now())
  useEffect(() => {
    const timer = setInterval(() => setCurrent(now()), 1000)
    return () => clearInterval(timer)
  }, [now])
  const seconds = Math.max(0, Math.floor((current - sinceMs) / 1000))
  return (
    <output className={styles.wait} aria-live="off">
      Waiting {seconds} s for the caller&rsquo;s answer
    </output>
  )
}
