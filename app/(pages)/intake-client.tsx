"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { STT_SAMPLE_RATE } from "@/audio/resample"
import { playSegment } from "@/audio/segment-player"
import type { ListenRequest } from "@/features/field-card/said-recorded"
import { useInCall } from "@/features/intake/in-call-loader"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { SessionPhase } from "@/features/intake/session-status"
import { solicitedField } from "@/features/intake/solicited-field"
import { useLiveOrder } from "@/features/intake/use-live-order"
import { type CallerTurn, useSession } from "@/features/intake/use-session"
import { groupOrder } from "@/features/order-summary/order-groups"
import { useReadBack } from "@/features/read-back/use-read-back"
import { useSessionRecorder } from "@/features/session-recorder/use-session-recorder"
import { countDecisions } from "@/features/telemetry/decision-counts"
import { useTelemetry } from "@/features/telemetry/use-telemetry"
import {
  agentEntry,
  callerEntry,
  type TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"

const LIVE_MODE = { kind: "live" } as const

export function IntakeClient() {
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)
  const finishRef = useRef<(() => void) | null>(null)
  const order = useLiveOrder()
  const readBack = useReadBack()
  const telemetry = useTelemetry()
  const recorder = useSessionRecorder()

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
      telemetry.turnEnded(turn.turnOrder)
      const fast = readBack.hear(turn.transcript)
      if (fast.endpointNow) {
        finishRef.current?.()
      }
      void order.recordTurn(turn).then((fresh) => {
        readBack.observe(fresh.candidates, fresh.decisions)
      })
    },
    [order, readBack, telemetry],
  )

  const onAgentLine = useCallback((text: string) => {
    setTranscript((previous) => [
      ...previous,
      agentEntry({ id: `agent-${previous.length}`, text, receivedAtMs: Date.now() % 1000000 }),
    ])
  }, [])

  const listen = useCallback(
    (request: ListenRequest) =>
      playSegment(request, { pcm: recorder.callerPcm(), sampleRate: STT_SAMPLE_RATE }),
    [recorder.callerPcm],
  )

  const onAgentAudio = useCallback(
    (base64: string) => {
      telemetry.agentAudio()
      recorder.agentAudio(base64)
    },
    [telemetry, recorder],
  )

  const solicited = useMemo(
    () => solicitedField(order.candidates, order.decisions, readBack.context),
    [order.candidates, order.decisions, readBack.context],
  )

  const session = useSession({
    onTranscriptTurn,
    onAgentLine,
    onAgentTurn: order.recordAgentTurn,
    onSessionBound: order.bind,
    onSessionClosed: order.finalize,
    onRecognizerModel: order.recordRecognizer,
    onFrame: (frame) => {
      telemetry.onFrame(frame)
      recorder.frame(frame)
    },
    onCallerAudio: recorder.callerAudio,
    onAgentAudio,
    solicited,
  })
  const live = session.phase === SessionPhase.Live
  finishRef.current = session.finishAnswer
  const inCall = useInCall(session.phase !== SessionPhase.Idle)

  useEffect(() => {
    telemetry.decisionsSeen(order.candidates, order.decisionHistory)
    recorder.state({
      candidates: order.candidates,
      decisions: order.decisionHistory,
      snapshot: order.snapshot,
    })
  }, [
    order.candidates,
    order.decisionHistory,
    order.snapshot,
    telemetry.decisionsSeen,
    recorder.state,
  ])

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
    telemetry.reset()
    recorder.reset()
    void session.start()
  }, [session, order, readBack, telemetry, recorder])

  const stop = useCallback(() => {
    void session.stop()
  }, [session])

  const groups = useMemo(
    () =>
      groupOrder({
        candidates: order.candidates,
        decisions: order.decisions,
        snapshot: order.snapshot,
      }),
    [order.candidates, order.decisions, order.snapshot],
  )

  return (
    <>
      <IntakeScreen
        candidates={order.candidates}
        decisions={order.decisions}
        transcript={transcript}
        readBack={readBack.context}
        fastPath={readBack.fastPath}
        phase={session.phase}
        fault={session.fault}
        faultDetail={session.faultDetail}
        alert={order.lastError}
        decisionHistory={order.decisionHistory}
        turnsHeld={order.turnsHeld}
        turnInFlight={order.turnInFlight}
        solicited={solicited}
        echoDiscards={session.echoDiscards}
        level={session.level}
        agentSpeaking={session.agentSpeaking}
        elapsedMs={elapsedMs}
        patience={session.patience}
        onStart={start}
        onStop={stop}
        onFinishAnswer={session.finishAnswer}
        snapshot={order.snapshot}
        onListen={listen}
        summary={
          inCall === null ? null : (
            <inCall.OrderPanel
              groups={groups}
              snapshot={order.snapshot}
              sessionId={session.sessionId}
              witness={order.witness}
            />
          )
        }
        telemetry={
          inCall === null ? null : (
            <inCall.TelemetryPanel
              mode={LIVE_MODE}
              phase={session.phase}
              sttModel={session.sttModel}
              sessionId={session.sessionId}
              log={telemetry.log}
              counts={countDecisions({
                candidates: order.candidates,
                decisionHistory: order.decisionHistory,
                snapshot: order.snapshot,
              })}
              decisions={order.decisionHistory}
              latency={telemetry.latency}
            />
          )
        }
      />
      {recorder.enabled && inCall !== null ? (
        <inCall.RecorderBar
          recorder={recorder}
          sessionId={session.sessionId}
          sttModel={session.sttModel}
          latency={telemetry.samples}
        />
      ) : null}
    </>
  )
}
