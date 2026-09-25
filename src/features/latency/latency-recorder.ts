import {
  type FieldCandidate,
  type GateDecision,
  LatencyInterval,
  type LatencySample,
} from "@/domain"

export type LatencySummary = {
  readonly interval: LatencyInterval
  readonly n: number
  readonly p50: number | null
  readonly p95: number | null
  readonly last: number | null
}

export type LatencyRecorder = {
  turnEnded: (turnOrder: number, atMs: number) => void
  decisionsSeen: (
    candidates: readonly FieldCandidate[],
    decisions: readonly GateDecision[],
    atMs: number,
  ) => void
  agentAudio: (atMs: number) => void
  samples: () => readonly LatencySample[]
  summary: (interval: LatencyInterval) => LatencySummary
  reset: () => void
}

export function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil(fraction * sorted.length) - 1
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))] ?? null
}

export function createLatencyRecorder(): LatencyRecorder {
  let samples: LatencySample[] = []
  const turnEnds = new Map<number, number>()
  const decidedAt = new Map<number, number>()
  const seenDecisions = new Set<string>()
  let awaitingAudio: number | null = null

  const push = (interval: LatencyInterval, turnOrder: number, ms: number) => {
    if (Number.isFinite(ms) && ms >= 0) {
      samples.push({ interval, turnOrder, ms: Math.round(ms) })
    }
  }

  return {
    turnEnded: (turnOrder, atMs) => {
      turnEnds.set(turnOrder, atMs)
      awaitingAudio = turnOrder
    },
    decisionsSeen: (candidates, decisions, atMs) => {
      for (const decision of decisions) {
        const key = `${decision.candidateId}:${decision.reasonCode}`
        if (seenDecisions.has(key)) {
          continue
        }
        seenDecisions.add(key)
        const candidate = candidates.find((entry) => entry.candidateId === decision.candidateId)
        const turnOrder = candidate?.provenance.turnOrder
        if (turnOrder === undefined || decidedAt.has(turnOrder)) {
          continue
        }
        const ended = turnEnds.get(turnOrder)
        if (ended === undefined) {
          continue
        }
        decidedAt.set(turnOrder, atMs)
        push(LatencyInterval.TurnToDecision, turnOrder, atMs - ended)
      }
    },
    agentAudio: (atMs) => {
      if (awaitingAudio === null) {
        return
      }
      const turnOrder = awaitingAudio
      awaitingAudio = null
      const ended = turnEnds.get(turnOrder)
      if (ended !== undefined) {
        push(LatencyInterval.TurnToAudio, turnOrder, atMs - ended)
      }
      const decided = decidedAt.get(turnOrder)
      if (decided !== undefined) {
        push(LatencyInterval.DecisionToAudio, turnOrder, atMs - decided)
      }
    },
    samples: () => samples,
    summary: (interval) => {
      const values = samples
        .filter((entry) => entry.interval === interval)
        .map((entry) => entry.ms)
      return {
        interval,
        n: values.length,
        p50: percentile(values, 0.5),
        p95: percentile(values, 0.95),
        last: values[values.length - 1] ?? null,
      }
    },
    reset: () => {
      samples = []
      turnEnds.clear()
      decidedAt.clear()
      seenDecisions.clear()
      awaitingAudio = null
    },
  }
}
