export type PublishedRate = {
  readonly product: string
  readonly perHourUsd: number
  readonly why: string
}

export const RATE_SOURCE_URL = "https://www.assemblyai.com/pricing"

export const RATE_CHECKED_ON = "2026-09-17"

export const PUBLISHED_RATES: readonly PublishedRate[] = Object.freeze([
  Object.freeze({
    product: "Voice Agent API",
    perHourUsd: 4.5,
    why: "The agent socket. Billed for as long as the socket is open, whether anyone is speaking or not.",
  }),
  Object.freeze({
    product: "Streaming Universal-3.5 Pro Realtime",
    perHourUsd: 0.45,
    why: "The recognizer socket, which the browser holds at the same time as the agent one.",
  }),
  Object.freeze({
    product: "Medical Mode surcharge",
    perHourUsd: 0.15,
    why: "Added on top of streaming for the medical vocabulary this domain needs.",
  }),
])

export const COMBINED_PER_HOUR_USD: number = PUBLISHED_RATES.reduce(
  (total, rate) => total + rate.perHourUsd,
  0,
)

export const COMBINED_PER_MINUTE_USD: number = COMBINED_PER_HOUR_USD / 60

export type CostEstimate = {
  readonly elapsedMs: number
  readonly usd: number
  readonly perHourUsd: number
  readonly socketsCounted: number
}

const NO_ELAPSED_TIME: null = null

export function estimateFromElapsed(elapsedMs: number): CostEstimate | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return NO_ELAPSED_TIME
  }
  return {
    elapsedMs,
    usd: (elapsedMs / 3600000) * COMBINED_PER_HOUR_USD,
    perHourUsd: COMBINED_PER_HOUR_USD,
    socketsCounted: PUBLISHED_RATES.length,
  }
}

export function formatUsd(usd: number): string {
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`
  }
  return `$${usd.toFixed(3)}`
}

export function formatPerHour(perHourUsd: number): string {
  return `$${perHourUsd.toFixed(2)}/hr`
}
