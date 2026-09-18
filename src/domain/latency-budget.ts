export const LATENCY_BUDGET_CHECKED_ON = "2026-09-17"

export const LATENCY_BUDGET_MS = Object.freeze({
  finalization: 500,
  socketOpen: 2500,
  gateDecision: 5,
})

export type LatencyMetric = keyof typeof LATENCY_BUDGET_MS

export type BudgetOrigin = "vendor published" | "deployment default"

export const LATENCY_BUDGET_ORIGIN: Readonly<Record<LatencyMetric, BudgetOrigin>> =
  Object.freeze({
    finalization: "vendor published",
    socketOpen: "deployment default",
    gateDecision: "deployment default",
  })

export const LATENCY_BUDGET_RATIONALE: Readonly<Record<LatencyMetric, string>> = Object.freeze({
  finalization:
    "the recognizer finalising a turn after the last audio frame. AssemblyAI publishes P95 under 500 ms as the streaming target and this deployment adopts that figure unchanged, so an exceedance is measured against the vendor's number rather than one we chose to be comfortable",
  socketOpen:
    "the handshake before any audio can be sent. No vendor figure exists for it, so 2500 ms is a ceiling chosen above the worst case we have recorded; read it as a regression alarm, never as a measured optimum, and note that a budget set from the same data it guards cannot also be evidence that the data is good",
  gateDecision:
    "the decision function itself, which measures in microseconds. The budget sits three orders of magnitude above the observed worst case so it catches a structural regression rather than tracking the noise of a shared machine",
})

export const LATENCY_BUDGET_GATING: Readonly<Record<LatencyMetric, boolean>> = Object.freeze({
  finalization: true,
  socketOpen: false,
  gateDecision: true,
})

export const LATENCY_BUDGET_GATING_NOTE =
  "only a budget whose number came from outside this project gates the build. A budget we set from our own recorded runs is counted and printed, but failing the build on it would mean failing against a line we drew ourselves after seeing the data"

export type Exceedance = {
  readonly metric: LatencyMetric
  readonly budgetMs: number
  readonly origin: BudgetOrigin
  readonly gating: boolean
  readonly observations: number
  readonly overBudget: number
  readonly worstMs: number
  readonly overBudgetValuesMs: readonly number[]
}

export function countExceedances(
  metric: LatencyMetric,
  samplesMs: readonly number[],
): Exceedance {
  const budgetMs = LATENCY_BUDGET_MS[metric]
  const over = samplesMs.filter((value) => value > budgetMs)
  return {
    metric,
    budgetMs,
    origin: LATENCY_BUDGET_ORIGIN[metric],
    gating: LATENCY_BUDGET_GATING[metric],
    observations: samplesMs.length,
    overBudget: over.length,
    worstMs: samplesMs.length === 0 ? 0 : Math.max(...samplesMs),
    overBudgetValuesMs: [...over].sort((a, b) => b - a),
  }
}

export function exceedanceVerdict(exceedance: Exceedance): string {
  if (exceedance.observations === 0) {
    return "no observation was recorded for this metric, so nothing is claimed about it; an empty sample must never read as a metric within budget"
  }
  return `${exceedance.overBudget} of ${exceedance.observations} exceeded ${exceedance.budgetMs} ms, worst case ${exceedance.worstMs} ms`
}

export function withinBudget(exceedance: Exceedance): boolean {
  return exceedance.observations > 0 && exceedance.overBudget === 0
}

export function breachesTheBuild(exceedance: Exceedance): boolean {
  return exceedance.gating && !withinBudget(exceedance)
}
