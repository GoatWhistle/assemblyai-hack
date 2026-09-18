export const RATES_CHECKED_ON = "2026-09-17"

export const RATES_SOURCE_URL = "https://www.assemblyai.com/pricing"

export const RATE_USD_PER_HOUR = Object.freeze({
  agent: 4.5,
  stt: 0.45,
  medical: 0.15,
})

export type SocketKind = keyof typeof RATE_USD_PER_HOUR

export const SPEND_METHOD_NOTE =
  "this is an estimate computed from socket-open seconds times the published hourly rate, not an invoice; AssemblyAI bills on socket lifetime rather than audio volume, so a run's cost here is its recorded open duration and nothing else"

export const SPEND_UNVERIFIABLE_NOTE =
  "the only figure we can verify against the vendor is the account balance a human reads off the dashboard on a named date; everything derived from the rate table is our own arithmetic over our own recorded runs"

export type PaidRun = {
  readonly runId: string
  readonly at: string
  readonly command: string
  readonly sockets: readonly SocketKind[]
  readonly openSeconds: number
  readonly outcome: "completed" | "failed" | "aborted"
}

export type RunCost = {
  readonly runId: string
  readonly usd: number
  readonly ratePerHour: number
}

export function ratePerHourFor(sockets: readonly SocketKind[]): number {
  let total = 0
  for (const socket of new Set(sockets)) {
    total += RATE_USD_PER_HOUR[socket]
  }
  return Math.round(total * 1000) / 1000
}

export function costOfRun(run: PaidRun): RunCost {
  const ratePerHour = ratePerHourFor(run.sockets)
  const usd = (run.openSeconds / 3600) * ratePerHour
  return { runId: run.runId, usd: Math.round(usd * 10000) / 10000, ratePerHour }
}

export type SpendTotal = {
  readonly runCount: number
  readonly failedRunCount: number
  readonly totalSeconds: number
  readonly usd: number
  readonly perRun: readonly RunCost[]
}

export function totalSpend(runs: readonly PaidRun[]): SpendTotal {
  const perRun = runs.map(costOfRun)
  const usd = perRun.reduce((sum, run) => sum + run.usd, 0)
  return {
    runCount: runs.length,
    failedRunCount: runs.filter((run) => run.outcome !== "completed").length,
    totalSeconds: runs.reduce((sum, run) => sum + run.openSeconds, 0),
    usd: Math.round(usd * 10000) / 10000,
    perRun,
  }
}

export function isPaidRun(value: unknown): value is PaidRun {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const shaped = value as Record<string, unknown>
  if (typeof shaped.runId !== "string" || shaped.runId.length === 0) {
    return false
  }
  if (typeof shaped.at !== "string" || typeof shaped.command !== "string") {
    return false
  }
  if (typeof shaped.openSeconds !== "number" || !Number.isFinite(shaped.openSeconds)) {
    return false
  }
  if (shaped.openSeconds < 0) {
    return false
  }
  if (!Array.isArray(shaped.sockets) || shaped.sockets.length === 0) {
    return false
  }
  if (
    !shaped.sockets.every(
      (socket) => socket === "agent" || socket === "stt" || socket === "medical",
    )
  ) {
    return false
  }
  return (
    shaped.outcome === "completed" ||
    shaped.outcome === "failed" ||
    shaped.outcome === "aborted"
  )
}

export function parseLedger(value: unknown): readonly PaidRun[] | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const runs = (value as { runs?: unknown }).runs
  if (!Array.isArray(runs)) {
    return null
  }
  if (!runs.every(isPaidRun)) {
    return null
  }
  return runs as readonly PaidRun[]
}
