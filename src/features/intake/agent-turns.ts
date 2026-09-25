import type { ReplyMeasure } from "@/audio/reply-clock"
import type { AgentTurn, AgentTurnStatus } from "@/domain"
import type { ReplyStatus } from "@/realtime/protocol"

type Outcome = {
  readonly reported: ReplyStatus | null
  readonly measure: ReplyMeasure
}

type Pending = {
  text: string | null
  interrupted: boolean
  outcome: Outcome | null
}

export type AgentTurnAssembler = {
  started: (replyId: string | null) => void
  transcript: (text: string, replyId: string | null, interrupted: boolean) => void
  done: (
    status: ReplyStatus | null,
    replyId: string | null,
    measure: Promise<ReplyMeasure>,
  ) => void
  reset: () => void
}

export function turnStatus(
  reported: ReplyStatus | null,
  interrupted: boolean,
): AgentTurnStatus {
  return reported === "completed" && !interrupted ? "completed" : "interrupted"
}

export function createAgentTurnAssembler(sink: (turn: AgentTurn) => void): AgentTurnAssembler {
  const pending = new Map<string, Pending>()
  let current: string | null = null
  let lastDone: string | null = null
  let counter = 0
  let generation = 0

  const fresh = (): string => {
    counter += 1
    return `local-reply-${counter}`
  }

  const entryFor = (replyId: string | null): [string, Pending] => {
    const id = replyId ?? current ?? lastDone ?? fresh()
    if (replyId === null && current === null && lastDone === null) {
      current = id
    }
    const existing = pending.get(id)
    if (existing !== undefined) {
      return [id, existing]
    }
    const created: Pending = { text: null, interrupted: false, outcome: null }
    pending.set(id, created)
    return [id, created]
  }

  const emitIfReady = (id: string, entry: Pending) => {
    if (entry.text === null || entry.outcome === null) {
      return
    }
    pending.delete(id)
    sink({
      role: "agent",
      replyId: id,
      text: entry.text,
      status: turnStatus(entry.outcome.reported, entry.interrupted),
      playedMs: entry.outcome.measure.playedMs,
      durationMs: entry.outcome.measure.durationMs,
    })
  }

  return {
    started: (replyId) => {
      lastDone = null
      current = replyId ?? fresh()
      entryFor(current)
    },
    transcript: (text, replyId, interrupted) => {
      const [id, entry] = entryFor(replyId)
      entry.text = text
      entry.interrupted = entry.interrupted || interrupted
      emitIfReady(id, entry)
    },
    done: (status, replyId, measure) => {
      const [id, entry] = entryFor(replyId)
      if (current === id) {
        current = null
      }
      lastDone = id
      const at = generation
      void measure.then((settled) => {
        if (at !== generation) {
          return
        }
        entry.outcome = { reported: status, measure: settled }
        emitIfReady(id, entry)
      })
    },
    reset: () => {
      generation += 1
      pending.clear()
      current = null
      lastDone = null
    },
  }
}
