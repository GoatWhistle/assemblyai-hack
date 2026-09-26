"use client"

import { useMemo } from "react"
import type { GateDecision } from "@/domain"
import { estimateFromElapsed } from "@/features/cost/published-rate"
import { RateEstimate } from "@/features/cost/rate-estimate"
import { RefusalCounter } from "@/features/gate-ledger/refusal-counter"
import { tallyRefusals } from "@/features/gate-ledger/refusal-tally"
import { RejectedTable } from "@/features/gate-ledger/rejected-table"
import styles from "./styles.module.css"

export type TechnicalLedgerProps = {
  readonly decisionHistory: readonly GateDecision[]
  readonly turnsHeld: number | null
  readonly elapsedMs: number
}

export function TechnicalLedger({
  decisionHistory,
  turnsHeld,
  elapsedMs,
}: TechnicalLedgerProps) {
  const tally = useMemo(() => tallyRefusals(decisionHistory), [decisionHistory])
  const estimate = useMemo(() => estimateFromElapsed(elapsedMs), [elapsedMs])
  return (
    <div className={styles.ledger}>
      <RefusalCounter tally={tally} turnsHeld={turnsHeld} />
      <RateEstimate estimate={estimate} />
      <RejectedTable decisionHistory={decisionHistory} />
    </div>
  )
}
