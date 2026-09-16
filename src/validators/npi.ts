import { makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"

const NPI_PREFIX = "80840"
const NPI_DIGITS = 10

function luhnSum(body: string): number {
  let total = 0
  for (let i = 0; i < body.length; i += 1) {
    const fromRight = body.length - 1 - i
    const digit = Number(body[fromRight])
    if (i % 2 === 0) {
      const doubled = digit * 2
      total += doubled > 9 ? doubled - 9 : doubled
    } else {
      total += digit
    }
  }
  return total
}

export function normalizeNpi(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  return digits.length === NPI_DIGITS ? digits : null
}

export function validateNpi(raw: string): ValidatorVerdict {
  const npi = normalizeNpi(raw)
  if (npi === null) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "npi_luhn",
      detail: `an NPI is exactly ${NPI_DIGITS} digits with no separators, got ${raw.replace(/\D/g, "").length}`,
      checkedValue: raw,
      evidence: { digitCount: raw.replace(/\D/g, "").length, expectedDigits: NPI_DIGITS },
    })
  }

  const body = NPI_PREFIX + npi.slice(0, 9)
  const sum = luhnSum(body)
  const computed = (10 - (sum % 10)) % 10
  const given = Number(npi[9])
  const passed = computed === given

  return makeVerdict({
    outcome: passed ? VerdictOutcome.Passed : VerdictOutcome.FailedChecksum,
    validatorName: "npi_luhn",
    detail: `sum=${sum}, computed check digit ${computed}, given ${given}`,
    checkedValue: npi,
    evidence: { sum, computed, given, prefix: NPI_PREFIX },
  })
}
