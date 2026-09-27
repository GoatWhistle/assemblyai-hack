"use client"

import { useState } from "react"
import type { LatencySample } from "@/domain"
import { DownloadIcon } from "@/shared/ui/icons"
import { Button } from "@/shared/ui/primitives/button"
import type { SessionRecorder } from "../use-session-recorder"
import styles from "./styles.module.css"

export type RecorderBarProps = {
  readonly recorder: SessionRecorder
  readonly sessionId: string | null
  readonly sttModel: string | null
  readonly latency: () => readonly LatencySample[]
}

export function RecorderBar({ recorder, sessionId, sttModel, latency }: RecorderBarProps) {
  const [exported, setExported] = useState<string | null>(null)
  const counts = recorder.counts()
  return (
    <aside className={styles.bar} aria-label="Session recorder, development only">
      <p className={styles.note}>
        Development recorder is on: both sockets' frames without audio, your microphone and the
        agent's voice are kept in this tab only. Record your own voice only.
      </p>
      <p className={styles.counts}>
        {counts.frames} frames · {Math.round(counts.callerBytes / 32000)} s caller ·{" "}
        {Math.round(counts.agentBytes / 48000)} s agent
      </p>
      <Button
        onClick={() => {
          const recording = recorder.exportRecording({
            sessionId,
            sttModel,
            latency: latency(),
          })
          setExported(recording.recordedAt)
        }}
      >
        <DownloadIcon />
        Export live recording
      </Button>
      {exported === null ? null : (
        <output className={styles.note}>Exported the recording made at {exported}.</output>
      )}
    </aside>
  )
}
