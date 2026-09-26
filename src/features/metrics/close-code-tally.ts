import { CloseCode, explainClose } from "@/realtime/close-codes"
import type { CloseCodeTally } from "./metric-definitions"
import { closeCodeCounts, recordedRuns, sessionsRecorded } from "./recorded-runs"

export const CLOSE_CODE_REPORT_COMMAND = "npx tsx scripts/eer/report.ts eval/<set>"

export const VENDOR_DOCUMENTS_NONE =
  "AssemblyAI documents no WebSocket close codes at all, checked against the streaming API reference on 17 September 2026. Every meaning below is therefore an observation, and the source column says whose."

export const ALERT_WORTHY_CODES: readonly number[] = Object.freeze([
  CloseCode.PolicyViolation,
  CloseCode.MalformedConfiguration,
  CloseCode.ThreeHourCap,
  CloseCode.SessionLimit,
])

const SOURCES: Readonly<Record<number, string>> = Object.freeze({
  1000: "Measured by us",
  1006: "Measured by us, once, in the 25 September stress run",
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

export function closeCodeRows(): readonly CloseCodeTally[] {
  return closeCodeCounts().map((row) => {
    const explanation = explainClose(row.code, "")
    return {
      code: row.code,
      label: explanation.label,
      meaning: explanation.explanation,
      count: row.count,
      alertWorthy: ALERT_WORTHY_CODES.includes(row.code),
      source: sourceOf(row.code),
    }
  })
}

export function closeCodeSetDescription(): string {
  const runs = recordedRuns()
    .map((run) => `${run.scored.length} from ${run.command}`)
    .join(", ")
  return `${sessionsRecorded()} recorded STT sessions (${runs}), read from each run's result-plain.json`
}

export function alertWorthyList(): string {
  const codes = ALERT_WORTHY_CODES.map(String)
  return `${codes.slice(0, -1).join(", ")} and ${codes.at(-1)}`
}
