import { describe, expect, it } from "vitest"
import { GateAction, ReasonCode } from "@/domain"
import { RefusalReason } from "@/features/gate-ledger/refusal-tally"
import { rejectedRows, rowsForReason } from "@/features/gate-ledger/rejected-rows"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"

const ACCEPTED = {
  ...LASA_DECISION,
  action: GateAction.Accept,
  reasonCode: ReasonCode.ValidatorPassedHighConf,
}
const BELOW_THRESHOLD = {
  ...LASA_DECISION,
  candidateId: "cand-2",
  action: GateAction.AskConfirm,
  reasonCode: ReasonCode.LowConfidence,
}
const VALIDATOR_FAILED = {
  ...LASA_DECISION,
  candidateId: "cand-3",
  action: GateAction.AskDisambiguate,
  reasonCode: ReasonCode.ValidatorChecksum,
}

describe("rejectedRows keeps only what the gate refused", () => {
  it("excludes an accepted decision", () => {
    const rows = rejectedRows([ACCEPTED])
    expect(
      rows,
      "an accepted value was not rejected and must not appear in this table",
    ).toEqual([])
  })

  it("includes a LASA re-ask and tags it with the LASA reason", () => {
    const rows = rejectedRows([LASA_DECISION])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.reason).toBe(RefusalReason.LasaPair)
    expect(rows[0]?.field).toBe(LASA_CANDIDATE.field)
  })

  it("keeps every rejected decision across a mixed history, in order", () => {
    const rows = rejectedRows([ACCEPTED, BELOW_THRESHOLD, LASA_DECISION, VALIDATOR_FAILED])
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.candidateId)).toEqual([
      BELOW_THRESHOLD.candidateId,
      LASA_DECISION.candidateId,
      VALIDATOR_FAILED.candidateId,
    ])
  })
})

describe("rowsForReason filters without losing rows that don't match anything meaningful", () => {
  const rows = rejectedRows([BELOW_THRESHOLD, LASA_DECISION, VALIDATOR_FAILED])

  it("returns every row when no reason is chosen", () => {
    expect(rowsForReason(rows, null)).toHaveLength(3)
  })

  it("isolates the LASA case, since that is the one a judge is looking for", () => {
    const filtered = rowsForReason(rows, RefusalReason.LasaPair)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.candidateId).toBe(LASA_DECISION.candidateId)
  })

  it("isolates the below-threshold reason distinctly from the validator failure", () => {
    expect(rowsForReason(rows, RefusalReason.BelowThreshold)).toHaveLength(1)
    expect(rowsForReason(rows, RefusalReason.ValidatorFailed)).toHaveLength(1)
  })

  it("returns nothing for a reason no row in this history carries", () => {
    expect(rowsForReason(rows, RefusalReason.AttemptsExhausted)).toEqual([])
  })
})
