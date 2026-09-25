import { IntakeLogFullError, SessionStorageError, UpstreamError } from "@/domain"
import {
  createRedisRestClient,
  type FetchLike,
  memoryStoreAllowed,
  processSingleton,
  type RedisRestConfig,
  redisConfigFrom,
  sharedStoreNames,
} from "@/sessions"
import {
  createMemoryEventStore,
  type IntakeEventStore,
  MAX_EVENTS_PER_LOG,
  type MemoryEventBacking,
  parseIntakeEvent,
} from "./intake-events"

const INTAKE_LOG_TTL_SECONDS = 24 * 60 * 60

export const INTAKE_KEY_PREFIX = "readback:intake:"

function createRedisEventStore(
  config: RedisRestConfig,
  doFetch: FetchLike = fetch,
): IntakeEventStore {
  const client = createRedisRestClient(config, "intake log store", doFetch)
  const keyOf = (sessionId: string): string => `${INTAKE_KEY_PREFIX}${sessionId}`

  return {
    async append(sessionId, event) {
      const key = keyOf(sessionId)
      const [pushed] = await client.pipeline([
        ["RPUSH", key, JSON.stringify(event)],
        ["EXPIRE", key, String(INTAKE_LOG_TTL_SECONDS)],
      ])
      const length = Number(pushed)
      if (!Number.isInteger(length) || length < 1) {
        throw new UpstreamError(502, "the intake log store did not report the new log length")
      }
      if (length > MAX_EVENTS_PER_LOG) {
        throw new IntakeLogFullError(sessionId, MAX_EVENTS_PER_LOG)
      }
      return length
    },
    async read(sessionId) {
      const result = await client.command([
        "LRANGE",
        keyOf(sessionId),
        "0",
        String(MAX_EVENTS_PER_LOG - 1),
      ])
      if (!Array.isArray(result)) {
        return []
      }
      return result.map((raw) => (typeof raw === "string" ? parseIntakeEvent(raw) : null))
    },
    async remove(sessionId) {
      await client.command(["DEL", keyOf(sessionId)])
    },
    backend() {
      return "redis"
    },
  }
}

export function chooseIntakeEventStore(
  env: Record<string, string | undefined>,
  doFetch: FetchLike = fetch,
  memoryBacking: MemoryEventBacking = processSingleton<MemoryEventBacking>(
    "intake-events",
    () => new Map(),
  ),
): IntakeEventStore {
  const config = redisConfigFrom(env)
  if (config !== null) {
    return createRedisEventStore(config, doFetch)
  }
  if (!memoryStoreAllowed(env)) {
    throw new SessionStorageError(
      `${sharedStoreNames()} is absent in production; the browser's turns and AssemblyAI's tool calls reach different serverless instances, so an in-memory intake log would silently never assemble the order`,
    )
  }
  return createMemoryEventStore(memoryBacking)
}

let active: IntakeEventStore | null = null

export function intakeEventStore(): IntakeEventStore {
  if (active === null) {
    active = chooseIntakeEventStore(process.env)
  }
  return active
}

export function installIntakeEventStore(store: IntakeEventStore | null): void {
  active = store
}
