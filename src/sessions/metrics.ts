import type { SessionSummary } from "@/domain"
import { type GateDecision, ReasonCode } from "@/domain"

export type ReasonBreakdown = { readonly reasonCode: string; readonly count: number }

export type MetricsReport = {
  readonly sessionCount: number
  readonly decisionCount: number
  readonly askCount: number
  readonly acceptCount: number
  readonly lasaCatchCount: number
  readonly askRate: number | null
  readonly byReasonCode: readonly ReasonBreakdown[]
  readonly falseAskRate: null
  readonly falseAskNote: string
  readonly method: string
}

export const FALSE_ASK_NOTE =
  "false-ask rate is undefined in live mode because ground truth is unknown; it is computed only over eval runs"

export const METRICS_METHOD =
  "counts over stored gate decisions; ask = action != accept; run make eval for held-out numbers"

export function reasonBreakdown(
  decisions: readonly GateDecision[],
): readonly ReasonBreakdown[] {
  const counts = new Map<string, number>()
  for (const decision of decisions) {
    counts.set(decision.reasonCode, (counts.get(decision.reasonCode) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count || a.reasonCode.localeCompare(b.reasonCode))
}

export function buildReport(
  summaries: readonly SessionSummary[],
  decisions: readonly GateDecision[],
): MetricsReport {
  const askCount = summaries.reduce((sum, s) => sum + s.askCount, 0)
  const acceptCount = summaries.reduce((sum, s) => sum + s.acceptCount, 0)
  const decisionCount = summaries.reduce((sum, s) => sum + s.decisionCount, 0)
  return {
    sessionCount: summaries.length,
    decisionCount,
    askCount,
    acceptCount,
    lasaCatchCount: summaries.reduce((sum, s) => sum + s.lasaCatchCount, 0),
    askRate: decisionCount === 0 ? null : askCount / decisionCount,
    byReasonCode: reasonBreakdown(decisions),
    falseAskRate: null,
    falseAskNote: FALSE_ASK_NOTE,
    method: METRICS_METHOD,
  }
}

export function lasaCatches(decisions: readonly GateDecision[]): readonly GateDecision[] {
  return decisions.filter((d) => d.reasonCode === ReasonCode.LasaHit)
}
