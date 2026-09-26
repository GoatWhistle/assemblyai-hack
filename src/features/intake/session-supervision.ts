"use client"

import { type MutableRefObject, useCallback, useMemo, useRef, useState } from "react"
import type { MicrophoneCapture } from "@/audio/microphone"
import type { AgentClient } from "@/realtime/agent-client"
import type { CloseExplanation } from "@/realtime/close-codes"
import { closeBothSockets } from "@/realtime/exit-path"
import type { SttClient } from "@/realtime/stt-client"
import type { AgentAudioSink } from "./agent-audio"
import { createReconnectSupervisor, type ReconnectSupervisor } from "./reconnect"
import type { SocketName } from "./session-events"
import { faultForClose, isRetryableClose, SessionFault, SessionPhase } from "./session-status"
import { createIdleTimer, type IdleTimer, type ReplyWatchdog } from "./session-timers"

export type LifecycleDeps = {
  readonly stt: MutableRefObject<SttClient | null>
  readonly agent: MutableRefObject<AgentClient | null>
  readonly capture: MutableRefObject<MicrophoneCapture | null>
  readonly audio: MutableRefObject<AgentAudioSink>
  readonly onTeardown: () => void
}

export type LiveParts = {
  readonly watchdog: ReplyWatchdog
  readonly releaseHalfDuplex: () => void
}

export type SessionLifecycle = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  setPhase: (phase: SessionPhase) => void
  setFault: (fault: SessionFault | null) => void
  begin: (parts: LiveParts) => void
  activity: () => void
  closed: (socket: SocketName, explanation: CloseExplanation, expected: boolean) => void
  halt: (fault: SessionFault) => Promise<void>
  stop: () => Promise<void>
  epoch: () => number
}

export function useSessionLifecycle(deps: LifecycleDeps): SessionLifecycle {
  const [phase, setPhase] = useState<SessionPhase>(SessionPhase.Idle)
  const [fault, setFault] = useState<SessionFault | null>(null)
  const active = useRef(false)
  const idle = useRef<IdleTimer | null>(null)
  const parts = useRef<LiveParts | null>(null)
  const supervisors = useRef<Record<SocketName, ReconnectSupervisor> | null>(null)
  const reconnecting = useRef(new Set<SocketName>())
  const tearing = useRef<Promise<void> | null>(null)
  const epochs = useRef(0)
  const depsRef = useRef(deps)
  depsRef.current = deps

  const teardown = useCallback(
    (nextFault: SessionFault | null, finalPhase: SessionPhase): Promise<void> => {
      if (tearing.current !== null) {
        return tearing.current
      }
      const run = async () => {
        const d = depsRef.current
        epochs.current += 1
        active.current = false
        idle.current?.cancel()
        idle.current = null
        parts.current?.watchdog.cancel()
        parts.current = null
        supervisors.current = null
        reconnecting.current.clear()
        if (nextFault !== null) {
          setFault(nextFault)
        }
        setPhase(SessionPhase.Closing)
        await closeBothSockets({ stt: d.stt.current, agent: d.agent.current })
        await d.capture.current?.stop()
        await d.audio.current.close()
        d.capture.current = null
        d.stt.current = null
        d.agent.current = null
        d.onTeardown()
        setPhase(finalPhase)
      }
      tearing.current = run().finally(() => {
        tearing.current = null
      })
      return tearing.current
    },
    [],
  )

  const supervise = useCallback(
    (socket: SocketName): ReconnectSupervisor =>
      createReconnectSupervisor({
        reconnect: () => {
          const d = depsRef.current
          const client = socket === "stt" ? d.stt.current : d.agent.current
          return client === null ? Promise.reject(new Error("no client")) : client.reconnect()
        },
        onReconnecting: () => {
          reconnecting.current.add(socket)
          if (socket === "agent") {
            parts.current?.watchdog.cancel()
            parts.current?.releaseHalfDuplex()
          }
          setPhase(SessionPhase.Reconnecting)
        },
        onRecovered: () => {
          reconnecting.current.delete(socket)
          if (active.current && reconnecting.current.size === 0) {
            setPhase(SessionPhase.Live)
          }
        },
        onDegraded: () => {
          void teardown(SessionFault.ReconnectFailed, SessionPhase.Degraded)
        },
      }),
    [teardown],
  )

  const begin = useCallback(
    (live: LiveParts) => {
      parts.current = live
      supervisors.current = { stt: supervise("stt"), agent: supervise("agent") }
      reconnecting.current.clear()
      idle.current?.cancel()
      idle.current = createIdleTimer(() => {
        void teardown(SessionFault.IdleEnded, SessionPhase.Closed)
      })
      active.current = true
    },
    [supervise, teardown],
  )

  const activity = useCallback(() => {
    idle.current?.activity()
  }, [])

  const closed = useCallback(
    (socket: SocketName, explanation: CloseExplanation, expected: boolean) => {
      if (!active.current || expected) {
        return
      }
      if (!isRetryableClose(explanation)) {
        void teardown(faultForClose(explanation), SessionPhase.Closed)
        return
      }
      supervisors.current?.[socket].unexpectedClose()
    },
    [teardown],
  )

  const halt = useCallback(
    (haltFault: SessionFault) => teardown(haltFault, SessionPhase.Closed),
    [teardown],
  )

  const stop = useCallback(
    () => teardown(null, active.current ? SessionPhase.Closed : SessionPhase.Idle),
    [teardown],
  )

  const epoch = useCallback(() => epochs.current, [])

  return useMemo(
    () => ({ phase, fault, setPhase, setFault, begin, activity, closed, halt, stop, epoch }),
    [phase, fault, begin, activity, closed, halt, stop, epoch],
  )
}
