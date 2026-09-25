import { z } from "zod"
import { FIELD_NAMES, type FieldName, IntakeLogFullError } from "@/domain"

export const MAX_EVENTS_PER_LOG = 2400

export const MAX_LIVE_SESSIONS = 64

const wordSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  confidence: z.number(),
  speaker: z.string().nullable(),
  wordIsFinal: z.boolean(),
})

const fieldSchema = z.enum(FIELD_NAMES as [FieldName, ...FieldName[]])

const intakeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("registered"),
    atMs: z.number(),
    agentId: z.string(),
    gateEnabled: z.boolean(),
  }),
  z.object({
    type: z.literal("caller_turn"),
    atMs: z.number(),
    turn: z.object({
      turnOrder: z.number(),
      transcript: z.string(),
      isFormatted: z.boolean(),
      words: z.array(wordSchema),
    }),
  }),
  z.object({
    type: z.literal("agent_turn"),
    atMs: z.number(),
    turn: z.object({
      role: z.literal("agent"),
      replyId: z.string(),
      text: z.string(),
      status: z.enum(["completed", "interrupted"]),
      playedMs: z.number(),
      durationMs: z.number(),
    }),
  }),
  z.object({
    type: z.literal("recognizer"),
    atMs: z.number(),
    model: z.string().nullable(),
    expectedModel: z.string(),
  }),
  z.object({
    type: z.literal("proposal"),
    atMs: z.number(),
    candidateId: z.string(),
    field: fieldSchema,
    value: z.string(),
    transcriptHint: z.string(),
  }),
  z.object({
    type: z.literal("read_back"),
    atMs: z.number(),
    field: fieldSchema,
    candidateId: z.string(),
    utterance: z.string(),
    style: z.enum(["plain", "spell_out"]),
  }),
  z.object({
    type: z.literal("confirmation"),
    atMs: z.number(),
    field: fieldSchema,
    candidateId: z.string(),
    utterance: z.string(),
    style: z.enum(["plain", "spell_out"]),
    callerAnswerHint: z.string().nullable(),
  }),
  z.object({
    type: z.literal("commit"),
    atMs: z.number(),
    fullOrderReadBack: z.string(),
    callerConfirmed: z.boolean(),
  }),
])

export type IntakeEvent = z.infer<typeof intakeEventSchema>

export function parseIntakeEvent(raw: string): IntakeEvent | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = intakeEventSchema.safeParse(json)
  return parsed.success ? parsed.data : null
}

export type IntakeEventStore = {
  append(sessionId: string, event: IntakeEvent): Promise<number>
  read(sessionId: string): Promise<readonly (IntakeEvent | null)[]>
  remove(sessionId: string): Promise<void>
  backend(): "redis" | "memory"
}

export type MemoryEventBacking = Map<string, string[]>

function evictOldest(backing: MemoryEventBacking): void {
  while (backing.size >= MAX_LIVE_SESSIONS) {
    const oldest = backing.keys().next()
    if (oldest.done === true) {
      return
    }
    backing.delete(oldest.value)
  }
}

export function createMemoryEventStore(
  backing: MemoryEventBacking = new Map(),
): IntakeEventStore {
  return {
    async append(sessionId, event) {
      let log = backing.get(sessionId)
      if (log === undefined) {
        evictOldest(backing)
        log = []
      } else {
        backing.delete(sessionId)
      }
      backing.set(sessionId, log)
      if (log.length >= MAX_EVENTS_PER_LOG) {
        throw new IntakeLogFullError(sessionId, MAX_EVENTS_PER_LOG)
      }
      log.push(JSON.stringify(event))
      return log.length
    },
    async read(sessionId) {
      const log = backing.get(sessionId) ?? []
      return log.slice(0, MAX_EVENTS_PER_LOG).map(parseIntakeEvent)
    },
    async remove(sessionId) {
      backing.delete(sessionId)
    },
    backend() {
      return "memory"
    },
  }
}

export function liveSessionCount(backing: MemoryEventBacking): number {
  return backing.size
}
