"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EchoGuard } from "@/audio/echo-guard"
import {
  type MicrophoneCapture,
  MicrophoneFailureReason,
  MicrophonePermissionError,
  requestMicrophone,
  startCapture,
} from "@/audio/microphone"
import { encodeBase64 } from "@/audio/resample"
import { type WordSpan, wordSpanFromTurnWord } from "@/domain"
import { AgentClient } from "@/realtime/agent-client"
import { closeBothSockets, installExitPath } from "@/realtime/exit-path"
import {
  agentPatiencePatch,
  type Patience,
  patienceFor,
  sttPatiencePatch,
} from "@/realtime/patience"
import { SttClient } from "@/realtime/stt-client"
import { TokenMintError } from "@/realtime/tokens"
import type { TransportFactory } from "@/realtime/transport"
import { createAgentAudioSink } from "./agent-audio"
import { faultForClose, SessionFault, SessionPhase } from "./session-status"
import { NOTHING_SOLICITED, type Solicited } from "./solicited-field"

export type SessionHandles = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly echoDiscards: number
  readonly level: number
  readonly agentSpeaking: boolean
  readonly patience: Patience
  readonly patienceSwitches: number
  start: () => Promise<void>
  stop: () => Promise<void>
  finishAnswer: () => void
}

const FAULT_OF_REASON: Readonly<Record<MicrophoneFailureReason, SessionFault>> = Object.freeze({
  [MicrophoneFailureReason.Denied]: SessionFault.MicrophoneDenied,
  [MicrophoneFailureReason.NoDevice]: SessionFault.MicrophoneAbsent,
  [MicrophoneFailureReason.DeviceBusy]: SessionFault.MicrophoneBusy,
  [MicrophoneFailureReason.InsecureContext]: SessionFault.InsecureContext,
  [MicrophoneFailureReason.Unknown]: SessionFault.MicrophoneDenied,
})

function faultForConnectError(error: unknown): SessionFault {
  if (error instanceof TokenMintError && error.status === 429) {
    return SessionFault.ConcurrencyReached
  }
  return SessionFault.TokenFailed
}

export type CallerTurn = {
  readonly transcript: string
  readonly turnOrder: number
  readonly isFormatted: boolean
  readonly words: readonly WordSpan[]
}

export type UseSessionOptions = {
  readonly onTranscriptTurn?: (turn: CallerTurn, discarded: boolean) => void
  readonly onAgentLine?: (text: string) => void
  readonly onEchoDiscarded?: (overlap: number) => void
  readonly solicited?: Solicited
  readonly transport?: TransportFactory
}

export function useSession(options: UseSessionOptions = {}): SessionHandles {
  const [phase, setPhase] = useState<SessionPhase>(SessionPhase.Idle)
  const [fault, setFault] = useState<SessionFault | null>(null)
  const [echoDiscards, setEchoDiscards] = useState(0)
  const [level, setLevel] = useState(0)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [patienceSwitches, setPatienceSwitches] = useState(0)
  const stt = useRef<SttClient | null>(null)
  const agent = useRef<AgentClient | null>(null)
  const capture = useRef<MicrophoneCapture | null>(null)
  const guard = useRef(new EchoGuard())
  const applied = useRef<string | null>(null)
  const audioOut = useRef(createAgentAudioSink())

  const solicited = options.solicited ?? NOTHING_SOLICITED
  const patience = patienceFor(solicited.field, solicited.awaitingConfirmation)

  useEffect(() => {
    const client = stt.current
    if (phase !== SessionPhase.Live || client === null || !client.isOpen) {
      return
    }
    if (applied.current === patience.name) {
      return
    }
    applied.current = patience.name
    client.updateConfiguration(sttPatiencePatch(patience))
    agent.current?.updateTurnDetection(agentPatiencePatch(patience))
    setPatienceSwitches((previous) => previous + 1)
  }, [patience, phase])

  useEffect(
    () =>
      installExitPath(() => ({ stt: stt.current, agent: agent.current }), {
        onClosing: () => setPhase(SessionPhase.Closing),
        onClosed: () => setPhase(SessionPhase.Closed),
      }),
    [],
  )

  const stop = useCallback(async () => {
    setPhase(SessionPhase.Closing)
    await closeBothSockets({ stt: stt.current, agent: agent.current })
    await capture.current?.stop()
    await audioOut.current.close()
    capture.current = null
    stt.current = null
    agent.current = null
    guard.current.reset()
    applied.current = null
    setLevel(0)
    setAgentSpeaking(false)
    setPhase(SessionPhase.Closed)
  }, [])

  const finishAnswer = useCallback(() => {
    const client = stt.current
    if (client === null || !client.isOpen) {
      return
    }
    client.forceEndpoint()
  }, [])

  const start = useCallback(async () => {
    setFault(null)
    setPhase(SessionPhase.RequestingMicrophone)
    let stream: MediaStream
    try {
      stream = await requestMicrophone()
    } catch (error) {
      setFault(
        error instanceof MicrophonePermissionError
          ? FAULT_OF_REASON[error.reason]
          : SessionFault.MicrophoneDenied,
      )
      setPhase(SessionPhase.Blocked)
      return
    }

    setPhase(SessionPhase.MintingTokens)
    const agentClient = new AgentClient({
      ...(options.transport === undefined ? {} : { transport: options.transport }),
      events: {
        onReplyStarted: () => {
          guard.current.replyStarted()
          capture.current?.setSttMuted(true)
          setAgentSpeaking(true)
        },
        onReplyDone: () => {
          guard.current.replyDone()
          capture.current?.setSttMuted(false)
          setAgentSpeaking(false)
        },
        onAgentTranscript: (text) => {
          guard.current.noteAgentTranscript(text)
          options.onAgentLine?.(text)
        },
        onReplyAudio: (base64) => audioOut.current.enqueue(base64),
        onSpeechStarted: () => audioOut.current.interrupt(),
        onClose: (explanation) => setFault(faultForClose(explanation)),
      },
    })
    const sttClient = new SttClient({
      ...(options.transport === undefined ? {} : { transport: options.transport }),
      events: {
        onTurn: (turn) => {
          if (!turn.end_of_turn) {
            return
          }
          const caller: CallerTurn = {
            transcript: turn.transcript,
            turnOrder: turn.turn_order,
            isFormatted: turn.turn_is_formatted,
            words: turn.words.map((word) => wordSpanFromTurnWord(word)),
          }
          const verdict = guard.current.inspectTurn(turn.transcript)
          if (verdict.discard) {
            setEchoDiscards((previous) => previous + 1)
            options.onEchoDiscarded?.(verdict.overlap)
            options.onTranscriptTurn?.(caller, true)
            return
          }
          options.onTranscriptTurn?.(caller, false)
        },
        onClose: (explanation) => setFault(faultForClose(explanation)),
      },
    })

    try {
      await Promise.all([agentClient.connect(), sttClient.connect()])
    } catch (error) {
      setFault(faultForConnectError(error))
      setPhase(SessionPhase.Blocked)
      for (const track of stream.getTracks()) {
        track.stop()
      }
      return
    }

    agent.current = agentClient
    stt.current = sttClient
    capture.current = await startCapture(stream, {
      onSttFrame: (bytes) => {
        if (guard.current.shouldSendToStt()) {
          sttClient.sendAudio(bytes)
          return
        }
        sttClient.keepAlive()
      },
      onAgentFrame: (samples) => agentClient.sendAudio(samples, encodeBase64),
      onLevel: (peak) => setLevel(peak),
    })
    applied.current = null
    setPhase(SessionPhase.Live)
  }, [options])

  return {
    phase,
    fault,
    echoDiscards,
    level,
    agentSpeaking,
    patience,
    patienceSwitches,
    start,
    stop,
    finishAnswer,
  }
}
