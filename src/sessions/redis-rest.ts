import { UpstreamError } from "@/domain"

const REDIS_ENV_PAIRS: readonly (readonly [string, string])[] = Object.freeze([
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
])

export type RedisRestConfig = {
  readonly url: string
  readonly token: string
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type RedisCommand = readonly string[]

export type RedisRestClient = {
  command(command: RedisCommand): Promise<unknown>
  pipeline(commands: readonly RedisCommand[]): Promise<readonly unknown[]>
}

type RedisReply = { readonly result?: unknown; readonly error?: unknown }

function replyOf(value: unknown): RedisReply {
  return typeof value === "object" && value !== null ? (value as RedisReply) : {}
}

function redisResultOf(value: unknown, subject: string): unknown {
  const reply = replyOf(value)
  if (reply.error !== undefined) {
    throw new UpstreamError(502, `the ${subject} refused a command: ${String(reply.error)}`)
  }
  return reply.result
}

export function createRedisRestClient(
  config: RedisRestConfig,
  subject: string,
  doFetch: FetchLike = fetch,
): RedisRestClient {
  const base = config.url.replace(/\/+$/, "")
  const headers = {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  }

  async function send(path: string, body: unknown): Promise<unknown> {
    const response = await doFetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!response.ok) {
      throw new UpstreamError(response.status, `the ${subject} answered ${response.status}`)
    }
    return response.json()
  }

  return {
    async command(command) {
      return redisResultOf(await send("", command), subject)
    },
    async pipeline(commands) {
      const replies = await send("/pipeline", commands)
      if (!Array.isArray(replies)) {
        throw new UpstreamError(502, `the ${subject} answered a pipeline with no reply list`)
      }
      return replies.map((reply) => redisResultOf(reply, subject))
    },
  }
}

function present(value: string | undefined): string | null {
  return value === undefined || value.trim().length === 0 ? null : value.trim()
}

export function redisConfigFrom(
  env: Record<string, string | undefined>,
): RedisRestConfig | null {
  for (const [urlName, tokenName] of REDIS_ENV_PAIRS) {
    const url = present(env[urlName])
    const token = present(env[tokenName])
    if (url !== null && token !== null) {
      return { url, token }
    }
  }
  return null
}

export function sharedStoreNames(): string {
  return REDIS_ENV_PAIRS.map(([url, token]) => `${url}/${token}`).join(" or ")
}

export function memoryStoreAllowed(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV !== "production" || env.READBACK_ALLOW_MEMORY_STORE === "1"
}
