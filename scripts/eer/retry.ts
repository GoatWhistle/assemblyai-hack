export const TRANSPORT_BACKOFF_MS: readonly number[] = [5000, 15000, 45000]

const RETRYABLE_VENDOR_CODES: readonly string[] = [
  "at_capacity",
  "concurrency_exceeded",
  "internal_error",
]

const TRANSPORT_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
])

export class VendorError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "VendorError"
    this.code = code
  }
}

export type RetryDeps = {
  readonly sleep: (ms: number) => Promise<void>
  readonly log: (line: string) => void
  readonly backoffMs: readonly number[]
}

export const DEFAULT_RETRY_DEPS: RetryDeps = {
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
  log: (line) => console.error(line),
  backoffMs: TRANSPORT_BACKOFF_MS,
}

function chainOf(error: unknown): readonly Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = []
  let current: unknown = error
  while (typeof current === "object" && current !== null && chain.length < 8) {
    const record = current as Record<string, unknown>
    chain.push(record)
    current = record.cause
  }
  return chain
}

export function isTransportFailure(error: unknown): boolean {
  if (error instanceof VendorError) {
    return false
  }
  return chainOf(error).some(
    (link) =>
      (typeof link.code === "string" && TRANSPORT_CODES.has(link.code)) ||
      link.message === "fetch failed",
  )
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof VendorError) {
    return RETRYABLE_VENDOR_CODES.includes(error.code)
  }
  return isTransportFailure(error)
}

export function describeFailure(error: unknown): string {
  const parts = chainOf(error).map((link) => {
    const code = typeof link.code === "string" ? `${link.code}: ` : ""
    return `${code}${String(link.message ?? "")}`
  })
  return parts.length === 0 ? String(error) : parts.join(" <- ")
}

export async function withRetry<T>(
  label: string,
  attempt: () => Promise<T>,
  deps: RetryDeps = DEFAULT_RETRY_DEPS,
): Promise<T> {
  for (let tried = 0; ; tried += 1) {
    try {
      return await attempt()
    } catch (error) {
      const wait = deps.backoffMs[tried]
      if (wait === undefined || !isRetryable(error)) {
        throw error
      }
      deps.log(
        `    retry ${tried + 1}/${deps.backoffMs.length} for ${label} in ${wait} ms after ${describeFailure(error)}`,
      )
      await deps.sleep(wait)
    }
  }
}
