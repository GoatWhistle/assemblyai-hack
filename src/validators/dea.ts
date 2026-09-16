import { makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"

const DEA_SHAPE = /^[A-Za-z]{2}\d{7}$/

export function normalizeDea(raw: string): string | null {
  const compact = raw.replace(/[\s-]/g, "")
  return DEA_SHAPE.test(compact) ? compact.toUpperCase() : null
}

export function validateDea(raw: string): ValidatorVerdict {
  const dea = normalizeDea(raw)
  if (dea === null) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "dea_mod10",
      detail: "a DEA number is two letters followed by seven digits, for example AB1234563",
      checkedValue: raw,
      evidence: { shape: "two letters + seven digits" },
    })
  }

  const digits = dea.slice(2).split("").map(Number)
  const odd = Number(digits[0]) + Number(digits[2]) + Number(digits[4])
  const even = Number(digits[1]) + Number(digits[3]) + Number(digits[5])
  const sum = odd + 2 * even
  const computed = sum % 10
  const given = Number(digits[6])
  const passed = computed === given

  return makeVerdict({
    outcome: passed ? VerdictOutcome.Passed : VerdictOutcome.FailedChecksum,
    validatorName: "dea_mod10",
    detail: `odd=${odd}, even=${even}, sum=${sum}, computed check digit ${computed}, given ${given}`,
    checkedValue: dea,
    evidence: { odd, even, sum, computed, given, letters: dea.slice(0, 2) },
  })
}
