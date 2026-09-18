"use client"

import { useCallback, useRef, useState } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import type { CallerTurn } from "./use-session"

type TurnResult = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: readonly GateDecision[]
}

const NO_TURN_RESULT: TurnResult = Object.freeze({
  candidates: Object.freeze([]),
  decisions: Object.freeze([]),
})

export type LiveOrder = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly decisionHistory: readonly GateDecision[]
  readonly turnsHeld: number | null
  readonly turnInFlight: boolean
  readonly lastError: string | null
  readonly sessionId: string
  recordTurn: (turn: CallerTurn) => Promise<TurnResult>
  reset: () => void
}

type TurnsResponse = {
  readonly turnsHeld?: number
  readonly candidates?: readonly FieldCandidate[]
  readonly decisions?: readonly GateDecision[]
  readonly error?: string
}

function newSessionId(): string {
  return `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLiveOrder(): LiveOrder {
  const [candidates, setCandidates] = useState<readonly FieldCandidate[]>([])
  const [decisions, setDecisions] = useState<ReadonlyMap<string, GateDecision>>(new Map())
  const [decisionHistory, setDecisionHistory] = useState<readonly GateDecision[]>([])
  const [turnsHeld, setTurnsHeld] = useState<number | null>(null)
  const [inFlight, setInFlight] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const sessionId = useRef(newSessionId())

  const recordTurn = useCallback(async (turn: CallerTurn): Promise<TurnResult> => {
    if (turn.words.length === 0) {
      return NO_TURN_RESULT
    }
    setInFlight((previous) => previous + 1)
    try {
      const response = await fetch(`/api/sessions/${sessionId.current}/turns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          turnOrder: turn.turnOrder,
          transcript: turn.transcript,
          isFormatted: turn.isFormatted,
          words: turn.words.map((word) => ({
            text: word.text,
            start: word.startMs,
            end: word.endMs,
            confidence: word.confidence,
          })),
        }),
      })
      const body = (await response.json()) as TurnsResponse
      if (!response.ok) {
        setLastError(body.error ?? `the turn was rejected with ${response.status}`)
        return NO_TURN_RESULT
      }
      const fresh: TurnResult = {
        candidates: body.candidates ?? [],
        decisions: body.decisions ?? [],
      }
      setTurnsHeld(body.turnsHeld ?? null)
      setCandidates(fresh.candidates)
      setDecisions(new Map(fresh.decisions.map((d) => [d.candidateId, d])))
      setDecisionHistory(fresh.decisions)
      setLastError(null)
      return fresh
    } catch {
      setLastError("the turn could not be sent to the server")
      return NO_TURN_RESULT
    } finally {
      setInFlight((previous) => Math.max(0, previous - 1))
    }
  }, [])

  const reset = useCallback(() => {
    sessionId.current = newSessionId()
    setCandidates([])
    setDecisions(new Map())
    setDecisionHistory([])
    setTurnsHeld(null)
    setLastError(null)
  }, [])

  return {
    candidates,
    decisions,
    decisionHistory,
    turnsHeld,
    turnInFlight: inFlight > 0,
    lastError,
    sessionId: sessionId.current,
    recordTurn,
    reset,
  }
}
