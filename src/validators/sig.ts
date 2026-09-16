import { makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"
import { ISMP_DO_NOT_USE, ISMP_SYMBOLS, type SigEntry } from "./sig-abbreviations"

export type SigFinding = {
  readonly found: string
  readonly confusedWith: string
  readonly instead: string
}

const TRAILING_ZERO = /(?<!\d)(\d+)\.0+(?!\d)/
const NAKED_DECIMAL = /(?<![\d.])\.\d/

function tokenize(sig: string): readonly string[] {
  return sig
    .toLowerCase()
    .split(/[\s,;()]+/)
    .filter((t) => t.length > 0)
}

const EAR_EYE_CONTEXT = /\b(drop|drops|instill|gtt|gtts|apply|ear|eye)\b/
const DAILY_CONTEXT = /\b(drop|drops|instill|gtt|gtts|apply|ear|eye|daily|tablet|tab)\b/

const CONTEXT_REQUIRED: ReadonlyMap<string, RegExp> = new Map([
  ["as", EAR_EYE_CONTEXT],
  ["ad", EAR_EYE_CONTEXT],
  ["au", EAR_EYE_CONTEXT],
  ["os", EAR_EYE_CONTEXT],
  ["ou", EAR_EYE_CONTEXT],
  ["od", DAILY_CONTEXT],
  ["ss", /\b(insulin|scale|tablet|tab|mg)\b/],
  ["u", /\d/],
  ["dc", /\b(drug|medication|med|therapy)\b/],
])

function matchesEntry(entry: SigEntry, tokens: readonly string[], lowered: string): boolean {
  if (entry.abbreviation.includes(" ")) {
    return lowered.includes(entry.abbreviation)
  }
  const present = tokens.some(
    (t) => t === entry.abbreviation || t.replace(/[.]/g, "") === entry.abbreviation,
  )
  if (!present) {
    return false
  }
  const context = CONTEXT_REQUIRED.get(entry.abbreviation)
  return context === undefined ? true : context.test(lowered)
}

export function findSigProblems(sig: string): readonly SigFinding[] {
  const lowered = sig.toLowerCase()
  const tokens = tokenize(sig)
  const findings: SigFinding[] = []

  for (const entry of ISMP_DO_NOT_USE) {
    if (matchesEntry(entry, tokens, lowered)) {
      findings.push({
        found: entry.abbreviation,
        confusedWith: entry.confusedWith,
        instead: entry.instead,
      })
    }
  }

  for (const symbol of ISMP_SYMBOLS) {
    if (sig.includes(symbol)) {
      findings.push({
        found: symbol,
        confusedWith: "an apothecary symbol misread as a digit or a metric unit",
        instead: "metric units",
      })
    }
  }

  const trailing = TRAILING_ZERO.exec(sig)
  if (trailing !== null) {
    findings.push({
      found: trailing[0],
      confusedWith: `a tenfold overdose when the decimal point is missed, read as ${trailing[0].replace(/\.0+$/, "0")}`,
      instead: `${trailing[1]} with no trailing zero`,
    })
  }

  const naked = NAKED_DECIMAL.exec(sig)
  if (naked !== null) {
    findings.push({
      found: naked[0],
      confusedWith: "a tenfold overdose when the leading decimal point is missed",
      instead: `a leading zero, as in 0${naked[0]}`,
    })
  }

  return findings
}

export function validateSig(sig: string): ValidatorVerdict {
  const findings = findSigProblems(sig)

  if (findings.length === 0) {
    return makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "sig_abbrev",
      detail: "no abbreviation from the ISMP error-prone list appears in these directions",
      checkedValue: sig,
      evidence: { findingCount: 0, listSize: ISMP_DO_NOT_USE.length },
    })
  }

  const names = findings.map((f) => f.found).join(", ")

  return makeVerdict({
    outcome: VerdictOutcome.FormatInvalid,
    validatorName: "sig_abbrev",
    detail: `${findings.length === 1 ? "an entry" : `${findings.length} entries`} from the ISMP error-prone list appear in these directions: ${names}`,
    checkedValue: sig,
    evidence: {
      findingCount: findings.length,
      found: names,
      confusedWith: findings.map((f) => f.confusedWith).join("; "),
      instead: findings.map((f) => f.instead).join("; "),
    },
  })
}
