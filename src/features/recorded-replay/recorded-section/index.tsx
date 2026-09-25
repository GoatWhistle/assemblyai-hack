"use client"

import { useEffect, useState } from "react"
import { loadPublishedRecording, type RecordingLoad } from "../load-recording"
import { RecordedPlayer } from "../recorded-player"
import styles from "./styles.module.css"

const NO_RECORDING_NOTE =
  "No recorded live session has been published yet, so the replay above is the synthesised one. When a recorded call is published it plays here with its real audio."

export function RecordedSection() {
  const [load, setLoad] = useState<RecordingLoad | null>(null)
  useEffect(() => {
    let live = true
    void loadPublishedRecording().then((result) => {
      if (live) {
        setLoad(result)
      }
    })
    return () => {
      live = false
    }
  }, [])
  if (load === null) {
    return null
  }
  if (load.state === "loaded") {
    return <RecordedPlayer recording={load.recording} />
  }
  return (
    <p className={styles.note}>
      {load.state === "absent"
        ? NO_RECORDING_NOTE
        : `Recorded session unavailable: ${load.message}.`}
    </p>
  )
}
