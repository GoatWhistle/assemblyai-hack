import { classifyCallerReply } from "@/confirmation"
import { normalizeDrugName } from "@/lasa"
import { formatInterval, wilson } from "@/stats"
import { type LiveSetItem, READ_BACK_VALUE, spokenIdentifier } from "./voice-set"

export type LiveWord = {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly confidence: number
}

export type LiveResult = {
  readonly id: string
  readonly transcript: string
  readonly words: readonly LiveWord[]
  readonly closeCode: number
}

export type LiveResultFile = {
  readonly measuredAt: string
  readonly keyterms: "none" | "lasa-names"
  readonly results: readonly LiveResult[]
}

export const NOT_MEASURED = "not measured"

const byId = (results: readonly LiveResult[]) => new Map(results.map((r) => [r.id, r]))

function heardDrug(transcript: string): string {
  const first =
    transcript
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .split(/\s+/)[0] ?? ""
  return normalizeDrugName(first)
}

export type SpeakerRow = { readonly speaker: string; readonly n: number; readonly line: string }

export type DrugFailure = {
  readonly id: string
  readonly expected: string
  readonly heard: string
  readonly minConfidence: number | null
  readonly partnerHeard: boolean
}

export type LiveSummary = {
  readonly drugN: number
  readonly drugErrors: number
  readonly overall: string
  readonly perSpeaker: readonly SpeakerRow[]
  readonly failures: readonly DrugFailure[]
  readonly naturalLasaMishearings: number
  readonly identifierN: number
  readonly identifierCorrect: number
  readonly nonCommandN: number
  readonly falseConfirmations: number
  readonly answerAgreement: { readonly n: number; readonly agreed: number }
}

function minConfidence(result: LiveResult): number | null {
  return result.words.length === 0 ? null : Math.min(...result.words.map((w) => w.confidence))
}

export function summariseLive(
  items: readonly LiveSetItem[],
  results: readonly LiveResult[],
): LiveSummary {
  const found = byId(results)
  const drugItems = items.filter(
    (i) => (i.kind === "lasa" || i.kind === "safe") && found.has(i.id),
  )
  const failures: DrugFailure[] = []
  for (const item of drugItems) {
    const result = found.get(item.id)
    const heard = heardDrug(result?.transcript ?? "")
    const expected = normalizeDrugName(String(item.expectedDrug))
    if (heard !== expected && result !== undefined) {
      failures.push({
        id: item.id,
        expected,
        heard,
        minConfidence: minConfidence(result),
        partnerHeard: item.lasaPartners.map(normalizeDrugName).includes(heard),
      })
    }
  }
  const speakers = [...new Set(drugItems.map((i) => i.speaker))].sort()
  const perSpeaker = speakers.map((speaker) => {
    const mine = drugItems.filter((i) => i.speaker === speaker)
    const errors = failures.filter((f) => f.id.startsWith(`${speaker}-`)).length
    return { speaker, n: mine.length, line: formatInterval(wilson(errors, mine.length)) }
  })
  const identifiers = items.filter(
    (i) => (i.kind === "npi" || i.kind === "dea") && found.has(i.id),
  )
  const answers = items.filter(
    (i) => (i.kind === "readback-answer" || i.kind === "non-command") && found.has(i.id),
  )
  const classified = answers.map((item) => ({
    item,
    verdict: classifyCallerReply({
      text: found.get(item.id)?.transcript ?? "",
      valueText: READ_BACK_VALUE,
    }).verdict,
  }))
  return {
    drugN: drugItems.length,
    drugErrors: failures.length,
    overall: formatInterval(wilson(failures.length, drugItems.length)),
    perSpeaker,
    failures,
    naturalLasaMishearings: failures.filter((f) => f.partnerHeard).length,
    identifierN: identifiers.length,
    identifierCorrect: identifiers.filter(
      (i) => spokenIdentifier(found.get(i.id)?.transcript ?? "") === i.expectedIdentifier,
    ).length,
    nonCommandN: classified.filter((c) => c.item.expectedAnswer !== "confirmed").length,
    falseConfirmations: classified.filter(
      (c) => c.item.expectedAnswer !== "confirmed" && c.verdict === "confirmed",
    ).length,
    answerAgreement: {
      n: classified.length,
      agreed: classified.filter((c) => c.verdict === c.item.expectedAnswer).length,
    },
  }
}

export type PauseSummary = {
  readonly n: number
  readonly p50: number | null
  readonly p95: number | null
  readonly max: number | null
  readonly overDefaultMinTurnSilence: number
}

const STT_DEFAULT_MIN_TURN_SILENCE_MS = 400

function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) {
    return null
  }
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? null
}

export function identifierPauses(
  items: readonly LiveSetItem[],
  results: readonly LiveResult[],
): PauseSummary {
  const found = byId(results)
  const gaps: number[] = []
  for (const item of items.filter((i) => i.kind === "npi" || i.kind === "dea")) {
    const words = found.get(item.id)?.words ?? []
    for (let index = 1; index < words.length; index += 1) {
      const gap = (words[index]?.start ?? 0) - (words[index - 1]?.end ?? 0)
      if (Number.isFinite(gap) && gap >= 0) {
        gaps.push(gap)
      }
    }
  }
  const sorted = [...gaps].sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? null,
    overDefaultMinTurnSilence: sorted.filter((gap) => gap > STT_DEFAULT_MIN_TURN_SILENCE_MS)
      .length,
  }
}

export type AblationSummary = {
  readonly n: number
  readonly partnerPlain: number
  readonly partnerHinted: number
}

export function keytermsAblation(
  items: readonly LiveSetItem[],
  plain: readonly LiveResult[],
  hinted: readonly LiveResult[],
): AblationSummary {
  const lasa = items.filter((i) => i.kind === "lasa")
  const a = summariseLive(lasa, plain)
  const b = summariseLive(lasa, hinted)
  return {
    n: Math.min(a.drugN, b.drugN),
    partnerPlain: a.naturalLasaMishearings,
    partnerHinted: b.naturalLasaMishearings,
  }
}
