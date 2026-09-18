import {
  cleanLasaRisk,
  type FieldCandidate,
  FieldName,
  type GateDecision,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { validateRefillSchedule } from "@/validators/schedule"
import { skeletonNeighbours } from "@/validators/skeleton"
import { MORPHINE, REFILLS_HEARD, VENORELBINE } from "./catalog-facts"

const SESSION = "attack-console"

function wordsFor(text: string, confidence: number) {
  return text.split(" ").map((token, index) =>
    makeWordSpan({
      text: token,
      startMs: 1000 + index * 400,
      endMs: 1300 + index * 400,
      confidence,
    }),
  )
}

function scheduleRefillCandidate(): FieldCandidate {
  const verdict = validateRefillSchedule({
    refills: REFILLS_HEARD,
    deaSchedule: MORPHINE.deaSchedule,
    drugName: MORPHINE.resolvesTo,
  })
  return makeCandidate({
    candidateId: "attack-schedule-refills",
    field: FieldName.Refills,
    rawValue: `${REFILLS_HEARD} refills`,
    normalizedValue: REFILLS_HEARD,
    provenance: makeProvenance({
      words: wordsFor(`five refills`, 1),
      turnOrder: 4,
      transcriptSlice: `${MORPHINE.heard}, five refills`,
      sessionId: SESSION,
    }),
    verdict,
    lasa: cleanLasaRisk(),
    attempt: 1,
  })
}

function skeletonCandidate(): FieldCandidate {
  const neighbour = skeletonNeighbours(VENORELBINE.heard, {
    namesForSkeleton: (skeleton) =>
      skeleton === VENORELBINE.skeleton ? VENORELBINE.skeletonNeighbours : [],
  })
  const named =
    neighbour === null
      ? ""
      : `; the same consonant skeleton "${neighbour.skeleton}" belongs to ${neighbour.candidates.join(" and ")}, which a vowel substitution would explain`
  return makeCandidate({
    candidateId: "attack-skeleton",
    field: FieldName.DrugName,
    rawValue: VENORELBINE.heard,
    normalizedValue: VENORELBINE.heard,
    provenance: makeProvenance({
      words: wordsFor(VENORELBINE.heard, 1),
      turnOrder: 5,
      transcriptSlice: VENORELBINE.heard,
      sessionId: SESSION,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.NotInCatalog,
      validatorName: "ndc_catalog",
      detail: `no prescription product in the built catalogue matches "${VENORELBINE.heard}"${named}`,
      checkedValue: VENORELBINE.heard,
      evidence: {
        hasCheckDigit: false,
        ...(neighbour === null
          ? {}
          : {
              skeleton: neighbour.skeleton,
              skeletonNeighbours: neighbour.candidates.join(", "),
            }),
      },
    }),
    lasa: cleanLasaRisk(),
    attempt: 1,
  })
}

export function decisionFor(candidate: FieldCandidate): GateDecision {
  return decide(candidate, policyFor(candidate.field))
}

export function proofCandidateFor(id: string): FieldCandidate | null {
  if (id === "schedule_refills") {
    return scheduleRefillCandidate()
  }
  if (id === "consonant_skeleton") {
    return skeletonCandidate()
  }
  return null
}
