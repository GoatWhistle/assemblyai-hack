"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { SessionPhase } from "@/features/intake/session-status"
import { useSession } from "@/features/intake/use-session"
import { initialContext, ReadBackState } from "@/features/read-back/read-back-machine"
import {
  agentEntry,
  callerEntry,
  type TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"

const NO_CANDIDATES: readonly FieldCandidate[] = []

export function IntakeClient() {
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)

  const onTranscriptTurn = useCallback((text: string, discarded: boolean) => {
    if (discarded) {
      return
    }
    setTranscript((previous) => [
      ...previous,
      callerEntry({
        id: `caller-${previous.length}`,
        text,
        turnOrder: previous.length,
        receivedAtMs: Date.now() % 1000000,
        words: [],
      }),
    ])
  }, [])

  const onAgentLine = useCallback((text: string) => {
    setTranscript((previous) => [
      ...previous,
      agentEntry({ id: `agent-${previous.length}`, text, receivedAtMs: Date.now() % 1000000 }),
    ])
  }, [])

  const session = useSession({ onTranscriptTurn, onAgentLine })
  const live = session.phase === SessionPhase.Live

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

  const decisions = useMemo(() => new Map<string, GateDecision>(), [])

  const readBack = useMemo(() => initialContext({ state: ReadBackState.Idle }), [])

  const start = useCallback(() => {
    setTranscript([])
    void session.start()
  }, [session])

  const stop = useCallback(() => {
    void session.stop()
  }, [session])

  return (
    <IntakeScreen
      candidates={NO_CANDIDATES}
      decisions={decisions}
      transcript={transcript}
      readBack={readBack}
      phase={session.phase}
      fault={session.fault}
      echoDiscards={session.echoDiscards}
      level={session.level}
      agentSpeaking={session.agentSpeaking}
      elapsedMs={elapsedMs}
      onStart={start}
      onStop={stop}
    />
  )
}
