import { makeVerdict, RULE_CITATIONS, type ValidatorVerdict, VerdictOutcome } from "@/domain"

export const NO_REFILL_SCHEDULE = "CII"

export const REFILL_RULE = RULE_CITATIONS.schedule_refills

export type ScheduleQuery = {
  readonly refills: number
  readonly deaSchedule: string | null
  readonly drugName: string | null
}

export function validateRefillSchedule(query: ScheduleQuery): ValidatorVerdict {
  const schedule = query.deaSchedule?.trim().toUpperCase() ?? null
  const named = query.drugName ?? "the proposed drug"
  const checkedValue = String(query.refills)

  if (schedule === null) {
    return makeVerdict({
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "schedule_refills",
      detail: `${named} carries no DEA schedule in the built catalogue, so the refill prohibition does not apply`,
      checkedValue,
      evidence: { deaSchedule: null },
    })
  }

  if (schedule !== NO_REFILL_SCHEDULE) {
    return makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "schedule_refills",
      detail: `${named} is ${schedule}, which the federal refill prohibition does not cover; ${checkedValue} refills stays a range question`,
      checkedValue,
      evidence: { deaSchedule: schedule },
    })
  }

  if (query.refills > 0) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "schedule_refills",
      detail: `${named} is Schedule II and ${checkedValue} refills were heard; a Schedule II prescription may carry none`,
      checkedValue,
      evidence: { deaSchedule: schedule, refillsHeard: query.refills, allowed: 0 },
    })
  }

  return makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "schedule_refills",
    detail: `${named} is Schedule II and zero refills were heard, which is what the schedule permits`,
    checkedValue,
    evidence: { deaSchedule: schedule, allowed: 0 },
  })
}
