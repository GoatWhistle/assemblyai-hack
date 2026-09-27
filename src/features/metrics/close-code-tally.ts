import { CloseCode, explainClose } from "@/realtime/close-codes"
import type { CloseCodeTally } from "./metric-definitions"
import {
  beforeLedgerRuns,
  closesIn,
  codesSeen,
  LIVE_RUN_COUNT_COMMAND,
  REPORT_ACCOUNT_RUNS,
  STRESS_COMMAND,
  sessionsIn,
  stressRun,
} from "./session-runs"

export const CLOSE_CODE_REPORT_COMMAND = "npx tsx scripts/eer/report.ts eval/<set>"

export const VENDOR_DOCUMENTS_NONE =
  "AssemblyAI documents no WebSocket close codes at all: its streaming API reference lists none. Every meaning below is therefore an observation, and the source column says whose."

export const ALERT_WORTHY_CODES: readonly number[] = Object.freeze([
  CloseCode.PolicyViolation,
  CloseCode.MalformedConfiguration,
  CloseCode.ThreeHourCap,
  CloseCode.SessionLimit,
])

const SOURCES: Readonly<Record<number, string>> = Object.freeze({
  1000: "Measured by us",
  1006: "Measured by us, once, in the stress run",
  1008: "Measured by us: what the rate limiter actually sends",
  3006: "Another team's measurement, not reproduced by us",
  3007: "Vendor prose, not a close-code table",
  3008: "Vendor prose, not a close-code table",
  3009: "Vendor prose, not a close-code table; never observed by us",
})

export const OBSERVATION_SOURCES: readonly (readonly [number, string])[] = Object.freeze(
  Object.entries(SOURCES).map(([code, source]) => [Number(code), source] as const),
)

export function sourceOf(code: number): string {
  return SOURCES[code] ?? "No observation recorded for this code"
}

function allRuns() {
  return [...beforeLedgerRuns(), stressRun()]
}

export function closeCodeRows(): readonly CloseCodeTally[] {
  const before = beforeLedgerRuns()
  const stress = [stressRun()]
  return codesSeen(allRuns()).map((code) => {
    const explanation = explainClose(code, "")
    const beforeLedger = closesIn(before, code)
    const inStress = closesIn(stress, code)
    return {
      code,
      label: explanation.label,
      meaning: explanation.explanation,
      count: beforeLedger + inStress,
      beforeLedger,
      stress: inStress,
      alertWorthy: ALERT_WORTHY_CODES.includes(code),
      source: sourceOf(code),
    }
  })
}

export type UnobservedCode = {
  readonly code: number
  readonly label: string
  readonly meaning: string
  readonly alertWorthy: boolean
  readonly source: string
}

export function unobservedCodeRows(): readonly UnobservedCode[] {
  const seen = new Set(codesSeen(allRuns()))
  return OBSERVATION_SOURCES.filter(([code]) => !seen.has(code)).map(([code, source]) => {
    const explanation = explainClose(code, "")
    return {
      code,
      label: explanation.label,
      meaning: explanation.explanation,
      alertWorthy: ALERT_WORTHY_CODES.includes(code),
      source,
    }
  })
}

export function sessionsCounted(): number {
  return sessionsIn(allRuns())
}

export type CloseCodeScope = {
  readonly beforeLedgerRuns: number
  readonly beforeLedgerSessions: number
  readonly fromReportSessions: number
  readonly stressSessions: number
  readonly beforeLedgerCommand: string
  readonly stressCommand: string
}

export function closeCodeScope(): CloseCodeScope {
  const before = beforeLedgerRuns()
  return {
    beforeLedgerRuns: before.length,
    beforeLedgerSessions: sessionsIn(before),
    fromReportSessions: sessionsIn(REPORT_ACCOUNT_RUNS),
    stressSessions: stressRun().sessions,
    beforeLedgerCommand: LIVE_RUN_COUNT_COMMAND,
    stressCommand: STRESS_COMMAND,
  }
}

export function alertWorthyList(): string {
  const codes = ALERT_WORTHY_CODES.map(String)
  return `${codes.slice(0, -1).join(", ")} and ${codes.at(-1)}`
}
