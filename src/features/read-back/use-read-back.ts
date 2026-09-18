"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  type FieldCandidate,
  GateAction,
  type GateDecision,
  policyFor,
  SpellOutStyle,
} from "@/domain"
import { type FastPath, fastPathFor, NO_FAST_PATH } from "./fast-path"
import {
  initialContext,
  type ReadBackContext,
  ReadBackState,
  reduceReadBack,
} from "./read-back-machine"

const ASKING: readonly GateAction[] = [
  GateAction.AskConfirm,
  GateAction.AskDisambiguate,
  GateAction.AskWhichPart,
  GateAction.AskSpellOut,
]

export function asksForVoice(decision: GateDecision): boolean {
  return ASKING.includes(decision.action)
}

export type ReadBackHandles = {
  readonly context: ReadBackContext
  readonly askedCandidateId: string | null
  readonly fastPath: FastPath
  observe: (candidates: readonly FieldCandidate[], decisions: readonly GateDecision[]) => void
  hear: (text: string) => FastPath
  reset: () => void
}

function contextForAsk(
  previous: ReadBackContext,
  candidate: FieldCandidate,
  decision: GateDecision,
): ReadBackContext {
  const policy = policyFor(candidate.field)
  const spelling =
    decision.action === GateAction.AskSpellOut ? policy.spellOutStyle : SpellOutStyle.None
  const requested = reduceReadBack(
    {
      ...previous,
      expectedValue: String(candidate.normalizedValue ?? candidate.rawValue),
      spellOutStyle: spelling,
      maxAttempts: policy.maxAttemptsBeforeEscalation,
    },
    { type: "request", field: candidate.field, utterance: decision.agentUtterance },
  )
  if (decision.action !== GateAction.AskSpellOut) {
    return requested
  }
  return reduceReadBack(requested, { type: "enter_spell_out" })
}

export function useReadBack(): ReadBackHandles {
  const [context, setContext] = useState<ReadBackContext>(() => initialContext())
  const [askedCandidateId, setAskedCandidateId] = useState<string | null>(null)
  const [fastPath, setFastPath] = useState<FastPath>(NO_FAST_PATH)
  const asked = useRef<string | null>(null)
  const live = useRef<ReadBackState>(ReadBackState.Idle)

  const observe = useCallback(
    (candidates: readonly FieldCandidate[], decisions: readonly GateDecision[]) => {
      const pending = [...decisions].reverse().find(asksForVoice)
      if (pending === undefined) {
        return
      }
      const candidate = candidates.find((c) => c.candidateId === pending.candidateId)
      if (candidate === undefined || asked.current === pending.candidateId) {
        return
      }
      asked.current = pending.candidateId
      setAskedCandidateId(pending.candidateId)
      setFastPath(NO_FAST_PATH)
      setContext((previous) => {
        const next = contextForAsk(previous, candidate, pending)
        live.current = next.state
        return next
      })
    },
    [],
  )

  const hear = useCallback((text: string): FastPath => {
    const decided = fastPathFor(live.current, text)
    setFastPath(decided)
    setContext((previous) => {
      const next =
        previous.state === ReadBackState.Idle
          ? previous
          : reduceReadBack(previous, { type: "heard", text })
      live.current = next.state
      return next
    })
    return decided
  }, [])

  const reset = useCallback(() => {
    asked.current = null
    live.current = ReadBackState.Idle
    setAskedCandidateId(null)
    setFastPath(NO_FAST_PATH)
    setContext(initialContext())
  }, [])

  return useMemo(
    () => ({ context, askedCandidateId, fastPath, observe, hear, reset }),
    [context, askedCandidateId, fastPath, observe, hear, reset],
  )
}
