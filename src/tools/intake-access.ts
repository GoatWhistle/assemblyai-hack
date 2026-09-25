import { SessionCollisionError, UnknownSessionError } from "@/domain"
import type { IntakeOutcome, IntakeState } from "./intake"
import type { IntakeEvent } from "./intake-events"
import { intakeEventStore } from "./redis-event-store"
import { replayIntake } from "./replay"

export async function loadIntake(sessionId: string): Promise<IntakeState | null> {
  return replayIntake(sessionId, await intakeEventStore().read(sessionId))
}

export async function isRegisteredSession(sessionId: string): Promise<boolean> {
  const events = await intakeEventStore().read(sessionId)
  return events[0]?.type === "registered"
}

export async function requireRegisteredIntake(sessionId: string): Promise<IntakeState> {
  const state = await loadIntake(sessionId)
  if (state === null) {
    throw new UnknownSessionError(sessionId)
  }
  return state
}

export async function registerIntake(input: {
  sessionId: string
  agentId: string
  gateEnabled?: boolean
  atMs?: number
}): Promise<void> {
  const store = intakeEventStore()
  const existing = await store.read(input.sessionId)
  if (existing.length > 0) {
    throw new SessionCollisionError(input.sessionId)
  }
  await store.append(input.sessionId, {
    type: "registered",
    atMs: input.atMs ?? Date.now(),
    agentId: input.agentId,
    gateEnabled: input.gateEnabled ?? true,
  })
}

export type RecordedEvent = {
  readonly state: IntakeState
  readonly seq: number
  readonly outcome: IntakeOutcome
}

export async function recordIntakeEvent(
  sessionId: string,
  event: IntakeEvent,
): Promise<RecordedEvent> {
  const store = intakeEventStore()
  const before = await store.read(sessionId)
  if (before[0]?.type !== "registered") {
    throw new UnknownSessionError(sessionId)
  }
  const seq = await store.append(sessionId, event)
  const after = await store.read(sessionId)
  const state = replayIntake(sessionId, after.slice(0, seq))
  if (state === null) {
    throw new UnknownSessionError(sessionId)
  }
  const outcome = state.outcomes.get(seq) ?? {
    status: 500,
    payload: { error: "the recorded event produced no outcome" },
  }
  return { state, seq, outcome }
}

export async function removeIntake(sessionId: string): Promise<void> {
  await intakeEventStore().remove(sessionId)
}
