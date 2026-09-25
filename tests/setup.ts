import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll } from "vitest"

export const PAID_CREDENTIAL_VARS = [
  "ASSEMBLYAI_API_KEY",
  "ASSEMBLYAI_AGENT_ID",
  "BLOB_READ_WRITE_TOKEN",
  "AGENT_TOOL_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "KV_REST_API_READ_ONLY_TOKEN",
  "KV_URL",
  "REDIS_URL",
] as const

export const NETWORK_BLOCK_MESSAGE = "tests do not reach the network"

for (const name of PAID_CREDENTIAL_VARS) {
  delete process.env[name]
}

function describeTarget(input: unknown): string {
  if (input instanceof Request) {
    return input.url
  }
  return String(input)
}

export async function blockedFetch(input: unknown): Promise<Response> {
  throw new Error(`${NETWORK_BLOCK_MESSAGE}: fetch ${describeTarget(input)} was refused`)
}

export class BlockedWebSocket {
  constructor(url: unknown) {
    throw new Error(`${NETWORK_BLOCK_MESSAGE}: WebSocket ${String(url)} was refused`)
  }
}

globalThis.fetch = blockedFetch as typeof fetch
Object.defineProperty(globalThis, "WebSocket", {
  value: BlockedWebSocket,
  writable: true,
  configurable: true,
})

beforeAll(() => {
  process.env.TZ = "UTC"
})

afterEach(() => {
  if (typeof globalThis.document === "undefined") {
    return
  }
  cleanup()
  globalThis.document.body.replaceChildren()
})
