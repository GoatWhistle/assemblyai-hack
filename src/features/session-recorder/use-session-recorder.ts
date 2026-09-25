"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  FieldCandidate,
  GateDecision,
  LatencySample,
  LiveOrderSnapshot,
  LiveRecording,
} from "@/domain"
import type { TappedFrame } from "@/realtime/frame-tap"
import { createRecording, recordingFileName } from "./recording"

const RECORDER_FLAG = "record"

export function recorderRequested(search: string, environment: string | undefined): boolean {
  if (environment === "production") {
    return false
  }
  return new URLSearchParams(search).get(RECORDER_FLAG) === "1"
}

export type SessionRecorder = {
  readonly enabled: boolean
  frame: (frame: TappedFrame) => void
  callerAudio: (bytes: Uint8Array) => void
  agentAudio: (base64: string) => void
  state: (state: {
    candidates: readonly FieldCandidate[]
    decisions: readonly GateDecision[]
    snapshot: LiveOrderSnapshot | null
  }) => void
  callerPcm: () => Uint8Array
  counts: () => { frames: number; callerBytes: number; agentBytes: number }
  exportRecording: (input: {
    sessionId: string | null
    sttModel: string | null
    latency: readonly LatencySample[]
  }) => LiveRecording
  reset: () => void
}

function download(recording: LiveRecording): void {
  const blob = new Blob([JSON.stringify(recording)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = recordingFileName(recording.recordedAt)
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useSessionRecorder(): SessionRecorder {
  const [enabled, setEnabled] = useState(false)
  const [recording] = useState(() => createRecording())

  useEffect(() => {
    setEnabled(recorderRequested(globalThis.location?.search ?? "", process.env.NODE_ENV))
  }, [])

  const frame = useCallback(
    (tapped: TappedFrame) => {
      if (enabled) {
        recording.frame(tapped)
      }
    },
    [enabled, recording],
  )

  const agentAudio = useCallback(
    (base64: string) => {
      if (enabled) {
        recording.agentAudio(base64)
      }
    },
    [enabled, recording],
  )

  const state = useCallback(
    (value: {
      candidates: readonly FieldCandidate[]
      decisions: readonly GateDecision[]
      snapshot: LiveOrderSnapshot | null
    }) => {
      if (enabled) {
        recording.state(value)
      }
    },
    [enabled, recording],
  )

  const exportRecording = useCallback(
    (input: {
      sessionId: string | null
      sttModel: string | null
      latency: readonly LatencySample[]
    }) => {
      const exported = recording.export({ ...input, recordedAt: new Date().toISOString() })
      download(exported)
      return exported
    },
    [recording],
  )

  return {
    enabled,
    frame,
    callerAudio: recording.callerAudio,
    agentAudio,
    state,
    callerPcm: recording.callerPcm,
    counts: recording.counts,
    exportRecording,
    reset: recording.reset,
  }
}
