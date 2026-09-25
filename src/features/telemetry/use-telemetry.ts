"use client"

import { useCallback, useMemo, useState } from "react"
import {
  type FieldCandidate,
  type GateDecision,
  LatencyInterval,
  type LatencySample,
} from "@/domain"
import { createLatencyRecorder, type LatencySummary } from "@/features/latency/latency-recorder"
import type { TappedFrame } from "@/realtime/frame-tap"
import { createFrameLog, type FrameLog } from "./frame-log"

export type Telemetry = {
  readonly log: FrameLog
  readonly latency: readonly LatencySummary[]
  onFrame: (frame: TappedFrame) => void
  turnEnded: (turnOrder: number) => void
  decisionsSeen: (
    candidates: readonly FieldCandidate[],
    decisions: readonly GateDecision[],
  ) => void
  agentAudio: () => void
  samples: () => readonly LatencySample[]
  reset: () => void
}

const INTERVALS: readonly LatencyInterval[] = [
  LatencyInterval.TurnToDecision,
  LatencyInterval.TurnToAudio,
  LatencyInterval.DecisionToAudio,
]

const browserNow = () => performance.now()

export function useTelemetry(now: () => number = browserNow): Telemetry {
  const [log] = useState(() => createFrameLog())
  const [recorder] = useState(() => createLatencyRecorder())
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((previous) => previous + 1), [])

  const latency = useMemo(() => {
    void version
    return INTERVALS.map((interval) => recorder.summary(interval))
  }, [recorder, version])

  const turnEnded = useCallback(
    (turnOrder: number) => {
      recorder.turnEnded(turnOrder, now())
    },
    [recorder, now],
  )

  const decisionsSeen = useCallback(
    (candidates: readonly FieldCandidate[], decisions: readonly GateDecision[]) => {
      const before = recorder.samples().length
      recorder.decisionsSeen(candidates, decisions, now())
      if (recorder.samples().length !== before) {
        bump()
      }
    },
    [recorder, now, bump],
  )

  const agentAudio = useCallback(() => {
    const before = recorder.samples().length
    recorder.agentAudio(now())
    if (recorder.samples().length !== before) {
      bump()
    }
  }, [recorder, now, bump])

  const reset = useCallback(() => {
    log.clear()
    recorder.reset()
    bump()
  }, [log, recorder, bump])

  return {
    log,
    latency,
    onFrame: log.push,
    turnEnded,
    decisionsSeen,
    agentAudio,
    samples: recorder.samples,
    reset,
  }
}
