"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EchoGuard } from "@/audio/echo-guard"
import { type MicrophoneCapture, startCapture } from "@/audio/microphone"
import { encodeBase64 } from "@/audio/resample"
import { AgentClient } from "@/realtime/agent-client"
import { installExitPath } from "@/realtime/exit-path"
import { type FrameSink, tapTransport } from "@/realtime/frame-tap"
import { patienceFor } from "@/realtime/patience"
import { SttClient } from "@/realtime/stt-client"
import { webSocketTransport } from "@/realtime/transport"
import { createAgentAudioSink } from "./agent-audio"
import { createAgentTurnAssembler } from "./agent-turns"
import { levelThrottle } from "./level-throttle"
import {
  agentEventsFor,
  releaseHalfDuplex,
  type SessionWiring,
  sttEventsFor,
} from "./session-events"
import type { FaultDetail, SessionHandles, UseSessionOptions } from "./session-options"
import { SessionFault, SessionPhase } from "./session-status"
import { useSessionLifecycle } from "./session-supervision"
import { createReplyWatchdog } from "./session-timers"
import { NOTHING_SOLICITED } from "./solicited-field"
import { abandon, acquireStream, detailOf, faultForConnectError } from "./start-faults"
import { usePatienceSync } from "./use-patience-sync"

export type { CallerTurn } from "./session-events"
export type { FaultDetail, SessionHandles, UseSessionOptions } from "./session-options"

export function useSession(options: UseSessionOptions = {}): SessionHandles {
  const [echoDiscards, setEchoDiscards] = useState(0)
  const [level, setLevel] = useState(0)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [sttModel, setSttModel] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [faultDetail, setFaultDetail] = useState<FaultDetail | null>(null)
  const stt = useRef<SttClient | null>(null)
  const agent = useRef<AgentClient | null>(null)
  const capture = useRef<MicrophoneCapture | null>(null)
  const guard = useRef(new EchoGuard())
  const bound = useRef<string | null>(null)
  const audioOut = useRef(createAgentAudioSink())
  const latest = useRef(options)
  latest.current = options

  const closedSession = useCallback(() => {
    const id = bound.current
    bound.current = null
    if (id !== null) {
      latest.current.onSessionClosed?.(id)
    }
  }, [])

  const life = useSessionLifecycle({
    stt,
    agent,
    capture,
    audio: audioOut,
    onTeardown: () => {
      guard.current.reset()
      setLevel(0)
      setAgentSpeaking(false)
      closedSession()
    },
  })
  const { phase, setPhase, fault, setFault } = life

  const solicited = options.solicited ?? NOTHING_SOLICITED
  const patience = patienceFor(solicited.field, solicited.awaitingConfirmation)
  const sync = usePatienceSync(stt, agent, phase, patience, (error) => {
    setFault(SessionFault.SocketParamRefused)
    setFaultDetail(detailOf(error))
  })

  useEffect(
    () =>
      installExitPath(() => ({ stt: stt.current, agent: agent.current }), {
        onClosing: () => setPhase(SessionPhase.Closing),
        onClosed: () => {
          setPhase(SessionPhase.Closed)
          closedSession()
        },
      }),
    [setPhase, closedSession],
  )

  const finishAnswer = useCallback(() => {
    if (stt.current?.isOpen === true) {
      stt.current.forceEndpoint()
    }
  }, [])

  const start = useCallback(async () => {
    if (agent.current !== null || stt.current !== null) {
      await life.stop()
    }
    setFault(null)
    setFaultDetail(null)
    setSttModel(null)
    setSessionId(null)
    setPhase(SessionPhase.RequestingMicrophone)
    const epoch = life.epoch()
    const stream = await acquireStream(
      () => life.epoch() === epoch,
      (blocked, detail) => {
        setFault(blocked)
        setFaultDetail(detail)
        setPhase(SessionPhase.Blocked)
      },
    )
    if (stream === null) {
      return
    }

    setPhase(SessionPhase.MintingTokens)
    const turns = createAgentTurnAssembler((turn) => latest.current.onAgentTurn?.(turn))
    const watchdog = createReplyWatchdog(() => {
      releaseHalfDuplex(wiring)
      setFault(SessionFault.ReplyStalled)
    })
    const wiring: SessionWiring = {
      guard: guard.current,
      audio: audioOut.current,
      turns,
      watchdog,
      activity: () => life.activity(),
      setSttMuted: (muted) => capture.current?.setSttMuted(muted),
      setAgentSpeaking,
      onAgentLine: (text) => latest.current.onAgentLine?.(text),
      onTranscriptTurn: (turn, discarded) => latest.current.onTranscriptTurn?.(turn, discarded),
      onEchoDiscarded: (overlap) => {
        setEchoDiscards((previous) => previous + 1)
        latest.current.onEchoDiscarded?.(overlap)
      },
      onClose: (socket, explanation, expected) => life.closed(socket, explanation, expected),
      onBound: (binding) => {
        bound.current = binding.sessionId
        setSessionId(binding.sessionId)
        latest.current.onSessionBound?.(binding)
      },
      onModel: (model) => {
        setSttModel(model)
        latest.current.onRecognizerModel?.(model)
      },
      onModelMismatch: (model) => {
        setSttModel(model)
        latest.current.onRecognizerModel?.(model)
        void life.halt(SessionFault.ModelMismatch)
      },
      onAgentError: (code, message) => {
        setFaultDetail({ code, message })
        setFault(SessionFault.AgentReported)
      },
      onAgentAudio: (base64) => latest.current.onAgentAudio?.(base64),
    }
    const tap: FrameSink = (frame) => latest.current.onFrame?.(frame)
    const transport = tapTransport(options.transport ?? webSocketTransport, tap)
    const agentClient = new AgentClient({ transport, events: agentEventsFor(wiring) })
    const sttClient = new SttClient({ transport, events: sttEventsFor(wiring) })

    try {
      await Promise.all([agentClient.connect(), sttClient.connect()])
    } catch (error) {
      const current = life.epoch() === epoch
      if (current) {
        setFault(faultForConnectError(error))
        setFaultDetail(detailOf(error))
        setPhase(SessionPhase.Blocked)
      }
      await abandon(stream, agentClient, sttClient)
      if (current) {
        closedSession()
      }
      return
    }
    if (life.epoch() !== epoch) {
      await abandon(stream, agentClient, sttClient)
      return
    }

    agent.current = agentClient
    stt.current = sttClient
    let opened: Awaited<ReturnType<typeof startCapture>>
    try {
      opened = await startCapture(stream, {
        onSttFrame: (bytes) => {
          if (guard.current.shouldSendToStt()) {
            latest.current.onCallerAudio?.(bytes)
            sttClient.sendAudio(bytes)
            return
          }
          sttClient.keepAlive()
        },
        onAgentFrame: (samples) => agentClient.sendAudio(samples, encodeBase64),
        onLevel: levelThrottle(setLevel),
      })
    } catch (error) {
      setFault(SessionFault.CaptureFailed)
      setFaultDetail(detailOf(error))
      setPhase(SessionPhase.Blocked)
      await abandon(stream, agentClient, sttClient)
      closedSession()
      return
    }
    if (life.epoch() !== epoch) {
      await opened.stop()
      return
    }
    capture.current = opened
    sync.forget()
    life.begin({ watchdog, releaseHalfDuplex: () => releaseHalfDuplex(wiring) })
    setPhase(SessionPhase.Live)
  }, [options.transport, life, setFault, setPhase, sync.forget, closedSession])

  return {
    phase,
    fault,
    faultDetail,
    echoDiscards,
    level,
    agentSpeaking,
    patience,
    patienceSwitches: sync.switches,
    sttModel,
    sessionId,
    start,
    stop: life.stop,
    finishAnswer,
  }
}
