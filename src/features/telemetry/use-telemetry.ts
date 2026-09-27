"use client"

import { useCallback, useState } from "react"
import type { FieldCandidate, GateDecision, LatencySample } from "@/domain"
import { createLatencyRecorder } from "@/features/latency/latency-recorder"

export type Telemetry = {
  turnEnded: (turnOrder: number) => void
  decisionsSeen: (
    candidates: readonly FieldCandidate[],
    decisions: readonly GateDecision[],
  ) => void
  agentAudio: () => void
  samples: () => readonly LatencySample[]
  reset: () => void
}

const browserNow = () => performance.now()

export function useTelemetry(now: () => number = browserNow): Telemetry {
  const [recorder] = useState(() => createLatencyRecorder())

  const turnEnded = useCallback(
    (turnOrder: number) => {
      recorder.turnEnded(turnOrder, now())
    },
    [recorder, now],
  )

  const decisionsSeen = useCallback(
    (candidates: readonly FieldCandidate[], decisions: readonly GateDecision[]) => {
      recorder.decisionsSeen(candidates, decisions, now())
    },
    [recorder, now],
  )

  const agentAudio = useCallback(() => {
    recorder.agentAudio(now())
  }, [recorder, now])

  const reset = useCallback(() => {
    recorder.reset()
  }, [recorder])

  return {
    turnEnded,
    decisionsSeen,
    agentAudio,
    samples: recorder.samples,
    reset,
  }
}
