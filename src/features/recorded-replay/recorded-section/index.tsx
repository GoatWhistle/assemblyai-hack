"use client"

import { useEffect, useState } from "react"
import { loadPublishedRecording, type RecordingLoad } from "../load-recording"
import { RecordedPlayer } from "../recorded-player"
import styles from "./styles.module.css"

export const UNAVAILABLE_NEXT_STEP =
  "The synthesised replay above still runs the whole pipeline; reload the page to try the recording again."

const NO_RECORDING_NOTE =
  "No recorded live session has been published yet, so the replay above is the synthesised one. When a recorded call is published it plays here with its real audio."

export type RecordedSectionProps = {
  readonly published?: boolean
}

export function RecordedSection({ published = true }: RecordedSectionProps) {
  const [load, setLoad] = useState<RecordingLoad | null>(published ? null : { state: "absent" })
  useEffect(() => {
    if (!published) {
      return
    }
    let live = true
    void loadPublishedRecording().then((result) => {
      if (live) {
        setLoad(result)
      }
    })
    return () => {
      live = false
    }
  }, [published])
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
        : `Recorded session unavailable: ${load.message}. ${UNAVAILABLE_NEXT_STEP}`}
    </p>
  )
}
