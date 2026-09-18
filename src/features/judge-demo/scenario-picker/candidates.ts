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

const SESSION = "scenario-picker"

function words(
  entries: readonly { readonly text: string; readonly confidence: number }[],
  startMs: number,
) {
  return entries.map((entry, index) =>
    makeWordSpan({
      text: entry.text,
      startMs: startMs + index * 420,
      endMs: startMs + index * 420 + 380,
      confidence: entry.confidence,
    }),
  )
}

export function cleanOrderCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "scenario-clean",
    field: FieldName.DosageForm,
    rawValue: "tablet",
    normalizedValue: "TABLET",
    provenance: makeProvenance({
      words: words([{ text: "tablet", confidence: 0.99 }], 4200),
      turnOrder: 3,
      transcriptSlice: "Tablet, by mouth.",
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "combo_consistency",
      detail: "lisinopril x 10 mg x TABLET x ORAL exists in the built catalogue",
      checkedValue: "TABLET",
      evidence: { drugName: "lisinopril", dosageForm: "TABLET", route: "ORAL" },
    }),
    status: CandidateStatus.AutoAccepted,
    attempt: 1,
    createdAt: "2026-09-15T09:01:00.000Z",
  })
}

export function pairHitCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "scenario-pair",
    field: FieldName.DrugName,
    rawValue: "Bisoprolol",
    normalizedValue: "bisoprolol",
    provenance: makeProvenance({
      words: words([{ text: "Bisoprolol", confidence: 1 }], 6800),
      turnOrder: 2,
      transcriptSlice: "Bisoprolol ten milligrams.",
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "bisoprolol fumarate is present in the built catalogue as a nonproprietary name",
      checkedValue: "bisoprolol",
      evidence: { matchedColumn: "nonproprietary_name" },
    }),
    lasa: lasaRiskFor("bisoprolol"),
    status: CandidateStatus.ReadBackPending,
    attempt: 1,
    createdAt: "2026-09-15T09:01:08.400Z",
  })
}

export function quietRoomCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "scenario-quiet",
    field: FieldName.Strength,
    rawValue: "ten milligrams",
    normalizedValue: "10 mg",
    provenance: makeProvenance({
      words: words(
        [
          { text: "ten", confidence: 0.61 },
          { text: "milligrams", confidence: 0.88 },
        ],
        7600,
      ),
      turnOrder: 2,
      transcriptSlice: "ten milligrams",
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "combo_consistency",
      detail: "lisinopril x 10 mg x TABLET x ORAL exists in the built catalogue",
      checkedValue: "10 mg",
      evidence: { drugName: "lisinopril", strength: "10 mg" },
    }),
    status: CandidateStatus.ReadBackPending,
    attempt: 1,
    createdAt: "2026-09-15T09:01:09.000Z",
  })
}

export function checksumCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "scenario-checksum",
    field: FieldName.PrescriberNpi,
    rawValue: "1234567890",
    normalizedValue: "1234567890",
    provenance: makeProvenance({
      words: words(
        [
          { text: "one", confidence: 0.97 },
          { text: "two", confidence: 0.98 },
          { text: "three", confidence: 0.97 },
        ],
        11200,
      ),
      turnOrder: 5,
      transcriptSlice: "NPI one two three four five six seven eight nine zero.",
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.FailedChecksum,
      validatorName: "npi_luhn",
      detail: "the Luhn check over 80840 plus the nine digits does not close",
      checkedValue: "1234567890",
      evidence: { prefix: "80840", closes: false },
    }),
    status: CandidateStatus.GateRejected,
    attempt: 1,
    createdAt: "2026-09-15T09:01:11.200Z",
  })
}

export function patientNameCandidate(): FieldCandidate {
  return makeCandidate({
    candidateId: "scenario-name",
    field: FieldName.PatientName,
    rawValue: "Jane Doe",
    normalizedValue: "Jane Doe",
    provenance: makeProvenance({
      words: words(
        [
          { text: "Jane", confidence: 0.99 },
          { text: "Doe", confidence: 0.98 },
        ],
        1680,
      ),
      turnOrder: 0,
      transcriptSlice: "The patient is Jane Doe.",
      sessionId: SESSION,
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "none",
      detail:
        "this field has no independent validator, so voice confirmation is the only proof",
      checkedValue: "Jane Doe",
    }),
    status: CandidateStatus.ReadBackPending,
    attempt: 1,
    createdAt: "2026-09-15T09:01:02.000Z",
  })
}
