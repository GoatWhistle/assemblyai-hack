import WebSocket from "ws"
import { DEFAULT_RETRY_DEPS, type RetryDeps, VendorError, withRetry } from "./retry"

export type StreamSocket = {
  readonly readyState: number
  send(data: string | Buffer): void
  on(event: "open", listener: () => void): unknown
  on(event: "message", listener: (data: Buffer) => void): unknown
  on(event: "close", listener: (code: number, reason: Buffer) => void): unknown
  on(event: "error", listener: (error: Error) => void): unknown
}

export type ConnectDeps = {
  readonly fetch: typeof fetch
  readonly open: (url: string) => StreamSocket
  readonly retry: RetryDeps
}

export const DEFAULT_CONNECT_DEPS: ConnectDeps = {
  fetch: (input, init) => fetch(input, init),
  open: (url) => new WebSocket(url),
  retry: DEFAULT_RETRY_DEPS,
}

function vendorCodeOf(body: string): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    const nested = parsed.error
    if (typeof nested === "object" && nested !== null) {
      const code = (nested as Record<string, unknown>).code
      if (typeof code === "string") {
        return code
      }
    }
    for (const value of [parsed.code, parsed.error_code, parsed.error]) {
      if (typeof value === "string") {
        return value
      }
    }
  } catch {
    return "unparsed_body"
  }
  return "no_code"
}

export async function mintToken(key: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(
    "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60",
    { headers: { Authorization: key } },
  )
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new VendorError(
      vendorCodeOf(body),
      `token mint failed with ${response.status}: ${body.slice(0, 200)}`,
    )
  }
  const body = (await response.json()) as { token: string }
  return body.token
}

export function openSocket(url: string, open: ConnectDeps["open"]): Promise<StreamSocket> {
  return new Promise<StreamSocket>((resolve, reject) => {
    const socket = open(url)
    let settled = false
    socket.on("open", () => {
      settled = true
      resolve(socket)
    })
    socket.on("error", (error: Error) => {
      if (!settled) {
        settled = true
        reject(error)
      }
    })
    socket.on("close", (code: number) => {
      if (!settled) {
        settled = true
        reject(new Error(`socket closed with ${code} before it opened`))
      }
    })
  })
}

export async function connectStreaming(
  label: string,
  key: string,
  query: URLSearchParams,
  deps: ConnectDeps = DEFAULT_CONNECT_DEPS,
): Promise<{
  readonly socket: StreamSocket
  readonly openedAt: number
  readonly openMs: number
}> {
  return await withRetry(
    label,
    async () => {
      const token = await mintToken(key, deps.fetch)
      const withToken = new URLSearchParams(query)
      withToken.set("token", token)
      const openedAt = Date.now()
      const socket = await openSocket(
        `wss://streaming.assemblyai.com/v3/ws?${withToken.toString()}`,
        deps.open,
      )
      return { socket, openedAt, openMs: Date.now() - openedAt }
    },
    deps.retry,
  )
}
