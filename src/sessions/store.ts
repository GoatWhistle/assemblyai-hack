import type { SessionRecord, SessionSummary } from "@/domain"
import { ReasonCode } from "@/domain"
import { type SessionOrigin, sessionOriginOf } from "./origin"

export type StoredSession = SessionRecord & {
  readonly orderId: string | null
  readonly committed: boolean
}

export type SessionStore = {
  put(session: StoredSession): Promise<void>
  get(sessionId: string): Promise<StoredSession | null>
  list(origin?: SessionOrigin): Promise<readonly SessionSummary[]>
  backend(): "blob" | "memory"
}

export function summarize(session: StoredSession): SessionSummary {
  const decisions = session.decisions
  return {
    sessionId: session.sessionId,
    origin: sessionOriginOf(session.origin),
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
    async list(origin) {
      return [...sessions.values()]
        .filter((session) => origin === undefined || sessionOriginOf(session.origin) === origin)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map(summarize)
    },
    backend() {
      return "memory"
    },
  }
}
