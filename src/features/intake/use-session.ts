"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EchoGuard } from "@/audio/echo-guard"
import {
  type MicrophoneCapture,
  MicrophonePermissionError,
  requestMicrophone,
  startCapture,
} from "@/audio/microphone"
import { encodeBase64 } from "@/audio/resample"
import { AgentClient } from "@/realtime/agent-client"
import { closeBothSockets, installExitPath } from "@/realtime/exit-path"
import { SttClient } from "@/realtime/stt-client"
import { SessionFault, SessionPhase } from "./session-status"

export type SessionHandles = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly echoDiscards: number
  readonly level: number
  readonly agentSpeaking: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

export type UseSessionOptions = {
  readonly onTranscriptTurn?: (transcript: string, discarded: boolean) => void
  readonly onAgentLine?: (text: string) => void
  readonly onEchoDiscarded?: (overlap: number) => void
}

export function useSession(options: UseSessionOptions = {}): SessionHandles {
  const [phase, setPhase] = useState<SessionPhase>(SessionPhase.Idle)
  const [fault, setFault] = useState<SessionFault | null>(null)
  const [echoDiscards, setEchoDiscards] = useState(0)
  const [level, setLevel] = useState(0)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const stt = useRef<SttClient | null>(null)
  const agent = useRef<AgentClient | null>(null)
  const capture = useRef<MicrophoneCapture | null>(null)
  const guard = useRef(new EchoGuard())

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
    capture.current = null
    stt.current = null
    agent.current = null
    guard.current.reset()
    setLevel(0)
    setAgentSpeaking(false)
    setPhase(SessionPhase.Closed)
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
          ? SessionFault.MicrophoneDenied
          : SessionFault.MicrophoneDenied,
      )
      setPhase(SessionPhase.Blocked)
      return
    }

    setPhase(SessionPhase.MintingTokens)
    const agentClient = new AgentClient({
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
      },
    })
    const sttClient = new SttClient({
      events: {
        onTurn: (turn) => {
          if (!turn.end_of_turn) {
            return
          }
          const verdict = guard.current.inspectTurn(turn.transcript)
          if (verdict.discard) {
            setEchoDiscards((previous) => previous + 1)
            options.onEchoDiscarded?.(verdict.overlap)
            options.onTranscriptTurn?.(turn.transcript, true)
            return
          }
          options.onTranscriptTurn?.(turn.transcript, false)
        },
        onClose: () => setFault(SessionFault.SocketDropped),
      },
    })

    try {
      await Promise.all([agentClient.connect(), sttClient.connect()])
    } catch {
      setFault(SessionFault.TokenFailed)
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
    setPhase(SessionPhase.Live)
  }, [options])

  return { phase, fault, echoDiscards, level, agentSpeaking, start, stop }
}
