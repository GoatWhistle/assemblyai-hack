import {
  FieldName,
  type FieldPolicy,
  GateAction,
  type GateDecision,
  ReasonCode,
} from "../../src/domain"
import { policyFor, withoutPairRule } from "../../src/domain/policy"

export type ArmId = "shipped" | "without_pair_rule" | "threshold_only"

export type Arm = {
  readonly id: ArmId
  readonly label: string
  readonly policy: FieldPolicy
}

const SHIPPED = policyFor(FieldName.DrugName)

export const ARMS: readonly Arm[] = Object.freeze([
  {
    id: "shipped",
    label: "shipped: pair rule, standing read-back, threshold",
    policy: SHIPPED,
  },
  {
    id: "without_pair_rule",
    label: "without the pair rule: standing read-back, threshold",
    policy: withoutPairRule(SHIPPED),
  },
  {
    id: "threshold_only",
    label: "threshold only: no pair rule, no standing read-back",
    policy: Object.freeze({ ...withoutPairRule(SHIPPED), readBackAlways: false }),
  },
])

export function armFor(id: ArmId): Arm {
  const arm = ARMS.find((entry) => entry.id === id)
  if (arm === undefined) {
    throw new Error(`no arm ${id}`)
  }
  return arm
}

export type Branch =
  | "catalogue_absence"
  | "other_validator"
  | "pair_rule"
  | "confidence_threshold"
  | "standing_read_back"
  | "accepted"

export const BRANCH_ORDER: readonly Branch[] = [
  "catalogue_absence",
  "other_validator",
  "pair_rule",
  "confidence_threshold",
  "standing_read_back",
  "accepted",
]

export const BRANCH_LABEL: Readonly<Record<Branch, string>> = Object.freeze({
  catalogue_absence: "catalogue absence",
  other_validator: "another validator",
  pair_rule: "pair rule, contrastive read-back",
  confidence_threshold: "confidence below threshold",
  standing_read_back: "standing read-back by regulation",
  accepted: "accepted without a question",
})

export function branchOf(decision: GateDecision): Branch {
  if (decision.action === GateAction.Accept) {
    return "accepted"
  }
  switch (decision.reasonCode) {
    case ReasonCode.ValidatorCatalog:
      return "catalogue_absence"
    case ReasonCode.LasaHit:
      return "pair_rule"
    case ReasonCode.LowConfidence:
    case ReasonCode.SpellOutAfterSecondFailure:
      return "confidence_threshold"
    case ReasonCode.ReadBackRequired:
      return "standing_read_back"
    default:
      return "other_validator"
  }
}

export function reflexYesWrites(branch: Branch): boolean {
  return (
    branch === "accepted" ||
    branch === "confidence_threshold" ||
    branch === "standing_read_back"
  )
}
