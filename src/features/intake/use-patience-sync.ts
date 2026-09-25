"use client"

import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react"
import type { AgentClient } from "@/realtime/agent-client"
import { agentPatiencePatch, type Patience, sttPatiencePatch } from "@/realtime/patience"
import type { SttClient } from "@/realtime/stt-client"
import { SessionPhase } from "./session-status"

export type PatienceSync = {
  readonly switches: number
  forget: () => void
}

export function usePatienceSync(
  stt: MutableRefObject<SttClient | null>,
  agent: MutableRefObject<AgentClient | null>,
  phase: SessionPhase,
  patience: Patience,
  onRefused: (error: unknown) => void,
): PatienceSync {
  const [switches, setSwitches] = useState(0)
  const applied = useRef<string | null>(null)
  const refused = useRef(onRefused)
  refused.current = onRefused

  useEffect(() => {
    const client = stt.current
    if (phase !== SessionPhase.Live || client === null || !client.isOpen) {
      return
    }
    if (applied.current === patience.name) {
      return
    }
    applied.current = patience.name
    try {
      client.updateConfiguration(sttPatiencePatch(patience))
      agent.current?.updateTurnDetection(agentPatiencePatch(patience))
    } catch (error) {
      refused.current(error)
      return
    }
    setSwitches((previous) => previous + 1)
  }, [patience, phase, stt, agent])

  const forget = useCallback(() => {
    applied.current = null
  }, [])

  return { switches, forget }
}
