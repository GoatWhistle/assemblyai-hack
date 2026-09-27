import { matchProvenance } from "@/confirmation"
import { ConfirmationReason, GateAction } from "@/domain"
import { evidenceFor } from "./apply-read-back"
import { loadIntake } from "./intake-access"

export type ConfirmationWait = {
  readonly timeoutMs: number
  readonly pollMs: number
}

export const DEFAULT_CONFIRMATION_WAIT: ConfirmationWait = Object.freeze({
  timeoutMs: 1500,
  pollMs: 100,
})

let wait: ConfirmationWait = DEFAULT_CONFIRMATION_WAIT

export function setConfirmationWait(next: ConfirmationWait | null): void {
  wait = next ?? DEFAULT_CONFIRMATION_WAIT
}

const STILL_ARRIVING: readonly string[] = [
  ConfirmationReason.NoReadBackTurn,
  ConfirmationReason.NoCallerAnswer,
]

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type WaitOutcome = "ready" | "timed_out" | "not_applicable"

export async function awaitCallerAnswer(input: {
  sessionId: string
  candidateId: string
  callerAnswerHint: string | null
}): Promise<WaitOutcome> {
  const deadline = Date.now() + wait.timeoutMs
  for (;;) {
    const state = await loadIntake(input.sessionId)
    const candidate = state?.candidates.get(input.candidateId)
    const decision = state?.decisions.findLast((d) => d.candidateId === input.candidateId)
    if (state === null || candidate === undefined || decision === undefined) {
      return "not_applicable"
    }
    if (decision.action === GateAction.Accept) {
      return "not_applicable"
    }
    const evidence = evidenceFor(state, candidate, input.callerAnswerHint)
    if (!STILL_ARRIVING.includes(evidence.reasonCode)) {
      return "ready"
    }
    if (Date.now() >= deadline) {
      return "timed_out"
    }
    await pause(Math.max(1, Math.min(wait.pollMs, deadline - Date.now())))
  }
}

export const DEFAULT_QUOTATION_WAIT: ConfirmationWait = Object.freeze({
  timeoutMs: 12000,
  pollMs: 150,
})

let quotationWait: ConfirmationWait = DEFAULT_QUOTATION_WAIT

export function setQuotationWait(next: ConfirmationWait | null): void {
  quotationWait = next ?? DEFAULT_QUOTATION_WAIT
}

export async function awaitQuotedTurn(input: {
  sessionId: string
  hint: string
}): Promise<WaitOutcome> {
  const deadline = Date.now() + quotationWait.timeoutMs
  for (;;) {
    const state = await loadIntake(input.sessionId)
    if (state === null) {
      return "not_applicable"
    }
    if (
      matchProvenance({ hint: input.hint, turns: state.turns, sessionId: input.sessionId }) !==
      null
    ) {
      return "ready"
    }
    if (Date.now() >= deadline) {
      return "timed_out"
    }
    await pause(Math.max(1, Math.min(quotationWait.pollMs, deadline - Date.now())))
  }
}
