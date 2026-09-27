import {
  type ConfirmationEvidence,
  type FieldCandidate,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import type { Status } from "@/shared/ui/primitives/status-chip"

export type SourceBadge = {
  readonly id: string
  readonly label: string
  readonly status: Status
}

const ARITHMETIC: readonly ValidatorName[] = ["npi_luhn", "dea_mod10"]
const CATALOGUE: readonly ValidatorName[] = ["ndc_catalog", "ndc_format", "combo_consistency"]
const RULE: readonly ValidatorName[] = ["range_check", "sig_abbrev", "schedule_refills"]

function badge(id: string, passed: boolean, yes: string, no: string): SourceBadge {
  return { id, label: passed ? yes : no, status: passed ? "written" : "refused" }
}

export function sourceBadges(
  candidate: FieldCandidate,
  evidence: ConfirmationEvidence | null,
): readonly SourceBadge[] {
  const passed = candidate.verdict.outcome === VerdictOutcome.Passed
  const name = candidate.verdict.validatorName
  const badges: SourceBadge[] = []
  if (candidate.lasa.hit) {
    badges.push({ id: "lasa", label: "Look-alike pair", status: "pair" })
  }
  if (name === "spoken_support") {
    badges.push(badge("spoken", passed, "spoken support", "not in what was said"))
  }
  if (ARITHMETIC.includes(name)) {
    badges.push(badge("arithmetic", passed, "arithmetic", "arithmetic failed"))
  }
  if (CATALOGUE.includes(name)) {
    badges.push(badge("catalogue", passed, "catalogue", "not in catalogue"))
  }
  if (RULE.includes(name)) {
    badges.push(badge("rule", passed, "documented rule", "rule failed"))
  }
  if (evidence !== null && evidence.verdict === "confirmed") {
    badges.push({ id: "aloud", label: "confirmed aloud", status: "written" })
  }
  return badges
}
