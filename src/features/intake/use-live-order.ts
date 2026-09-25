"use client"

import { useCallback, useRef, useState } from "react"
import {
  type AgentTurn,
  type CallerTurnBody,
  type FieldCandidate,
  type GateDecision,
  type OrderWitness,
  type RecognizerReport,
  type SessionBinding,
  STT_MODEL,
  type TurnBody,
} from "@/domain"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import { readOrderWitness } from "@/features/receipt/witness-badge"
import { NO_TURN_RESULT, readTurnReply, type TurnResult } from "./turn-response"
import type { CallerTurn } from "./use-session"

export type { TurnResult } from "./turn-response"

const UNBOUND_SESSION_ERROR =
  "no server-issued session id yet, so the turn was not sent under an invented one"

export type LiveOrder = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly decisionHistory: readonly GateDecision[]
  readonly snapshot: LiveOrderSnapshot | null
  readonly witness: OrderWitness | null
  readonly turnsHeld: number | null
  readonly turnInFlight: boolean
  readonly lastError: string | null
  readonly sessionId: string | null
  bind: (binding: SessionBinding) => void
  recordTurn: (turn: CallerTurn) => Promise<TurnResult>
  recordAgentTurn: (turn: AgentTurn) => Promise<void>
  recordRecognizer: (model: string | null) => void
  finalize: (sessionId: string) => Promise<void>
  reset: () => void
}

export function callerBody(turn: CallerTurn): CallerTurnBody {
  return {
    turnOrder: turn.turnOrder,
    transcript: turn.transcript,
    isFormatted: turn.isFormatted,
    words: turn.words.map((word) => ({
      text: word.text,
      start: word.startMs,
      end: word.endMs,
      confidence: word.confidence,
    })),
  }
}

export function recognizerReport(model: string | null): RecognizerReport {
  return { role: "recognizer", model, expectedModel: STT_MODEL }
}

async function postTurn(sessionId: string, body: TurnBody): Promise<Response> {
  return fetch(`/api/sessions/${encodeURIComponent(sessionId)}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

export function useLiveOrder(): LiveOrder {
  const [candidates, setCandidates] = useState<readonly FieldCandidate[]>([])
  const [decisions, setDecisions] = useState<ReadonlyMap<string, GateDecision>>(new Map())
  const [decisionHistory, setDecisionHistory] = useState<readonly GateDecision[]>([])
  const [snapshot, setSnapshot] = useState<LiveOrderSnapshot | null>(null)
  const [witness, setWitness] = useState<OrderWitness | null>(null)
  const [turnsHeld, setTurnsHeld] = useState<number | null>(null)
  const [inFlight, setInFlight] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [boundId, setBoundId] = useState<string | null>(null)
  const sessionId = useRef<string | null>(null)
  const finalized = useRef(new Set<string>())
  const issued = useRef(0)
  const newest = useRef(0)

  const pendingModel = useRef<RecognizerReport | null>(null)

  const apply = useCallback((fresh: TurnResult) => {
    setTurnsHeld(fresh.turnsHeld)
    setCandidates(fresh.candidates)
    setDecisions(new Map(fresh.decisions.map((d) => [d.candidateId, d])))
    setDecisionHistory(fresh.decisions)
    setSnapshot(fresh.snapshot)
    setLastError(null)
  }, [])

  const send = useCallback(
    async (body: TurnBody, role: string): Promise<TurnResult> => {
      const id = sessionId.current
      if (id === null) {
        setLastError(UNBOUND_SESSION_ERROR)
        return NO_TURN_RESULT
      }
      issued.current += 1
      const ticket = issued.current
      setInFlight((previous) => previous + 1)
      try {
        const reply = await readTurnReply(await postTurn(id, body), role)
        if (!reply.ok) {
          setLastError(reply.error)
          return NO_TURN_RESULT
        }
        if (ticket > newest.current) {
          newest.current = ticket
          apply(reply.result)
        }
        return reply.result
      } catch {
        setLastError(`the ${role} turn could not be sent to the server`)
        return NO_TURN_RESULT
      } finally {
        setInFlight((previous) => Math.max(0, previous - 1))
      }
    },
    [apply],
  )

  const recordTurn = useCallback(
    async (turn: CallerTurn): Promise<TurnResult> => {
      if (turn.words.length === 0) {
        return NO_TURN_RESULT
      }
      return send(callerBody(turn), "caller")
    },
    [send],
  )

  const recordAgentTurn = useCallback(
    async (turn: AgentTurn): Promise<void> => {
      await send(turn, "agent")
    },
    [send],
  )

  const recordRecognizer = useCallback(
    (model: string | null) => {
      const report = recognizerReport(model)
      if (sessionId.current === null) {
        pendingModel.current = report
        return
      }
      void send(report, "recognizer")
    },
    [send],
  )

  const bind = useCallback(
    (binding: SessionBinding) => {
      sessionId.current = binding.sessionId
      setBoundId(binding.sessionId)
      const pending = pendingModel.current
      pendingModel.current = null
      if (pending !== null) {
        void send(pending, "recognizer")
      }
    },
    [send],
  )

  const finalize = useCallback(async (id: string): Promise<void> => {
    if (finalized.current.has(id)) {
      return
    }
    finalized.current.add(id)
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(id)}/finalize`, {
        method: "POST",
        keepalive: true,
      })
      if (!response.ok) {
        setLastError(`the finished session could not be stored: ${response.status}`)
        return
      }
      const body = (await response.json().catch(() => null)) as { witness?: unknown } | null
      setWitness(readOrderWitness(body?.witness))
    } catch {
      setLastError("the finished session could not be sent to the server for storage")
    }
  }, [])

  const reset = useCallback(() => {
    sessionId.current = null
    pendingModel.current = null
    setBoundId(null)
    setCandidates([])
    setDecisions(new Map())
    setDecisionHistory([])
    setSnapshot(null)
    setWitness(null)
    setTurnsHeld(null)
    setLastError(null)
  }, [])

  return {
    candidates,
    decisions,
    decisionHistory,
    snapshot,
    witness,
    turnsHeld,
    turnInFlight: inFlight > 0,
    lastError,
    sessionId: boundId,
    bind,
    recordTurn,
    recordAgentTurn,
    recordRecognizer,
    finalize,
    reset,
  }
}
