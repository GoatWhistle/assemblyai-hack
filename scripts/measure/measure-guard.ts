import { ratePerHourFor } from "@/domain"

export const SPACING_SECONDS = 24

export type Preflight = {
  readonly ready: boolean
  readonly reason: string
}

export function preflight(runs: number): Preflight {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.trim().length === 0) {
    return {
      ready: false,
      reason:
        "ASSEMBLYAI_API_KEY is not set. This target spends credit on live sockets, so it refuses to run rather than reporting a number it did not measure.",
    }
  }
  if (!Number.isInteger(runs) || runs < 1) {
    return { ready: false, reason: `runs must be a positive integer, got ${runs}` }
  }
  return { ready: true, reason: "" }
}

export const SECONDS_PER_RUN = 40

export function costEstimate(runs: number): string {
  const hours = (runs * SECONDS_PER_RUN) / 3600
  const total = hours * ratePerHourFor(["agent", "stt", "medical"])
  return `${runs} runs of ~${SECONDS_PER_RUN}s on two sockets is about $${total.toFixed(2)} of credit`
}

export function spacingNote(runs: number): string {
  const minutes = Math.ceil((runs * SPACING_SECONDS) / 60)
  return `the free tier allows 5 new sessions per minute and each run opens two sockets, so runs are spaced ${SPACING_SECONDS}s apart: about ${minutes} minutes`
}
