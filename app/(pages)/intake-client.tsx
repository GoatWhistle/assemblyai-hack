"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { SessionPhase } from "@/features/intake/session-status"
import { solicitedField } from "@/features/intake/solicited-field"
import { useLiveOrder } from "@/features/intake/use-live-order"
import { type CallerTurn, useSession } from "@/features/intake/use-session"
import { useReadBack } from "@/features/read-back/use-read-back"
import {
  agentEntry,
  callerEntry,
  type TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"

export function IntakeClient() {
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)
  const finishRef = useRef<(() => void) | null>(null)
  const order = useLiveOrder()
  const readBack = useReadBack()

  const onTranscriptTurn = useCallback(
    (turn: CallerTurn, discarded: boolean) => {
      setTranscript((previous) => [
        ...previous,
        callerEntry({
          id: `caller-${previous.length}`,
          text: turn.transcript,
          turnOrder: turn.turnOrder,
          receivedAtMs: Date.now() % 1000000,
          words: turn.words,
          discarded,
          discardReason: discarded ? "matched the agent's own last line" : null,
        }),
      ])
      if (discarded) {
        return
      }
      const fast = readBack.hear(turn.transcript)
      if (fast.endpointNow) {
        finishRef.current?.()
      }
      void order.recordTurn(turn).then((fresh) => {
        readBack.observe(fresh.candidates, fresh.decisions)
      })
    },
    [order, readBack],
  )

  const onAgentLine = useCallback((text: string) => {
    setTranscript((previous) => [
      ...previous,
      agentEntry({ id: `agent-${previous.length}`, text, receivedAtMs: Date.now() % 1000000 }),
    ])
  }, [])

  const solicited = useMemo(
    () => solicitedField(order.candidates, order.decisions, readBack.context),
    [order.candidates, order.decisions, readBack.context],
  )

  const session = useSession({ onTranscriptTurn, onAgentLine, solicited })
  const live = session.phase === SessionPhase.Live
  finishRef.current = session.finishAnswer

  useEffect(() => {
    if (!live) {
      startedAt.current = null
      return
    }
    startedAt.current = Date.now()
    setElapsedMs(0)
    const tick = globalThis.window?.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsedMs(Date.now() - startedAt.current)
      }
    }, 1000)
    return () => {
      if (tick !== undefined) {
        globalThis.window?.clearInterval(tick)
      }
    }
  }, [live])

  const start = useCallback(() => {
    setTranscript([])
    order.reset()
    readBack.reset()
    void session.start()
  }, [session, order, readBack])

  const stop = useCallback(() => {
    void session.stop()
  }, [session])

  return (
    <IntakeScreen
      candidates={order.candidates}
      decisions={order.decisions}
      transcript={transcript}
      readBack={readBack.context}
      fastPath={readBack.fastPath}
      phase={session.phase}
      fault={session.fault}
      decisionHistory={order.decisionHistory}
      turnsHeld={order.turnsHeld}
      turnInFlight={order.turnInFlight}
      echoDiscards={session.echoDiscards}
      level={session.level}
      agentSpeaking={session.agentSpeaking}
      elapsedMs={elapsedMs}
      patience={session.patience}
      onStart={start}
      onStop={stop}
      onFinishAnswer={session.finishAnswer}
    />
  )
}
