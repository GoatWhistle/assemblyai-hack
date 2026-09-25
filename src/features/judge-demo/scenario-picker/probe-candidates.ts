import {
  CandidateStatus,
  type FieldCandidate,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  VerdictOutcome,
} from "@/domain"
import { lasaRiskFor } from "@/lasa"

const SESSION = "scenario-picker-probes"

export const UNKNOWN_NAME_HEARD = "Veltaprine"

export const FLUENT_TURN =
  "Hydroxyzine twenty-five milligrams three times a day, ninety tablets, no refills."

const FLUENT_WORD_MS = 360

function contiguous(texts: readonly string[], startMs: number, confidence: number) {
  return texts.map((text, index) =>
    makeWordSpan({
      text,
      startMs: startMs + index * FLUENT_WORD_MS,
      endMs: startMs + (index + 1) * FLUENT_WORD_MS,
      confidence,
    }),
  )
}

export function unknownValueCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "probe-unknown",
    field: FieldName.DrugName,
    rawValue: UNKNOWN_NAME_HEARD,
    normalizedValue: UNKNOWN_NAME_HEARD.toLowerCase(),
    provenance: makeProvenance({
      words: contiguous([UNKNOWN_NAME_HEARD], 5400, 0.97),
      turnOrder: 2,
      transcriptSlice: `${UNKNOWN_NAME_HEARD} five milligrams.`,
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.NotInCatalog,
      validatorName: "ndc_catalog",
      detail: `${UNKNOWN_NAME_HEARD.toLowerCase()} matches no proprietary or nonproprietary name in the built catalogue`,
      checkedValue: UNKNOWN_NAME_HEARD.toLowerCase(),
      evidence: { matchedColumn: null, skeletonNeighbours: "" },
    }),
    lasa: lasaRiskFor(UNKNOWN_NAME_HEARD.toLowerCase()),
    status: CandidateStatus.GateRejected,
    attempt: 1,
    createdAt: "2026-09-15T09:02:05.400Z",
  })
}

export const FLUENT_WORDS = contiguous(FLUENT_TURN.replace(/[,.]/g, "").split(" "), 3100, 1)

export function fluentWrongPartnerCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "probe-fluent",
    field: FieldName.DrugName,
    rawValue: "Hydroxyzine",
    normalizedValue: "hydroxyzine",
    provenance: makeProvenance({
      words: FLUENT_WORDS.slice(0, 1),
      turnOrder: 2,
      transcriptSlice: FLUENT_TURN,
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail:
        "hydroxyzine hydrochloride is present in the built catalogue as a nonproprietary name",
      checkedValue: "hydroxyzine",
      evidence: {
        matchedColumn: "nonproprietary_name",
        saltStripped: "hydroxyzine hydrochloride",
      },
    }),
    lasa: lasaRiskFor("hydroxyzine"),
    status: CandidateStatus.ReadBackPending,
    attempt: 1,
    createdAt: "2026-09-15T09:02:03.100Z",
  })
}
