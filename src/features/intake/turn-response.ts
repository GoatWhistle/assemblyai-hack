import type { FieldCandidate, GateDecision } from "@/domain"
import { type LiveOrderSnapshot, readSnapshot } from "@/features/order-summary/live-snapshot"

export type TurnResult = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: readonly GateDecision[]
  readonly turnsHeld: number | null
  readonly snapshot: LiveOrderSnapshot | null
}

export const NO_TURN_RESULT: TurnResult = Object.freeze({
  candidates: Object.freeze([]),
  decisions: Object.freeze([]),
  turnsHeld: null,
  snapshot: null,
})

export type TurnReply =
  | { readonly ok: true; readonly result: TurnResult }
  | { readonly ok: false; readonly error: string }

export async function readTurnReply(response: Response, role: string): Promise<TurnReply> {
  let body: Record<string, unknown> = {}
  try {
    const parsed = (await response.json()) as unknown
    if (typeof parsed === "object" && parsed !== null) {
      body = parsed as Record<string, unknown>
    }
  } catch {
    body = {}
  }
  if (!response.ok) {
    const error = typeof body.error === "string" ? body.error : null
    return {
      ok: false,
      error: error ?? `the ${role} turn was rejected with ${response.status}`,
    }
  }
  return {
    ok: true,
    result: {
      candidates: Array.isArray(body.candidates) ? (body.candidates as FieldCandidate[]) : [],
      decisions: Array.isArray(body.decisions) ? (body.decisions as GateDecision[]) : [],
      turnsHeld: typeof body.turnsHeld === "number" ? body.turnsHeld : null,
      snapshot: readSnapshot(body.order),
    },
  }
}
