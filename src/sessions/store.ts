import type { SessionRecord, SessionSummary } from "@/domain"
import { ReasonCode } from "@/domain"

export type StoredSession = SessionRecord & {
  readonly orderId: string | null
  readonly committed: boolean
}

export type SessionStore = {
  put(session: StoredSession): Promise<void>
  get(sessionId: string): Promise<StoredSession | null>
  list(): Promise<readonly SessionSummary[]>
  backend(): "blob" | "memory"
}

export function summarize(session: StoredSession): SessionSummary {
  const decisions = session.decisions
  return {
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    decisionCount: decisions.length,
    askCount: decisions.filter((d) => d.action !== "accept").length,
    acceptCount: decisions.filter((d) => d.action === "accept").length,
    lasaCatchCount: decisions.filter((d) => d.reasonCode === ReasonCode.LasaHit).length,
  }
}

export function createMemoryStore(): SessionStore {
  const sessions = new Map<string, StoredSession>()
  return {
    async put(session) {
      sessions.set(session.sessionId, session)
    },
    async get(sessionId) {
      return sessions.get(sessionId) ?? null
    },
    async list() {
      return [...sessions.values()]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map(summarize)
    },
    backend() {
      return "memory"
    },
  }
}
