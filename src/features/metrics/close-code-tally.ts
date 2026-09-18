import { explainClose, isAlertWorthy } from "@/realtime/close-codes"
import type { CloseCodeTally } from "./metric-definitions"
import { closeCodeCounts, sessionsRecorded } from "./recorded-runs"

export function closeCodeRows(): readonly CloseCodeTally[] {
  return closeCodeCounts().map((row) => {
    const explanation = explainClose(row.code, "")
    return {
      code: row.code,
      label: explanation.label,
      meaning: explanation.explanation,
      count: row.count,
      alertWorthy: isAlertWorthy(row.code),
    }
  })
}

export function closeCodeSetDescription(): string {
  return `${sessionsRecorded()} recorded STT sessions across the development, control and native-rate runs`
}
