export const AttackId = {
  ThresholdToZero: "threshold_to_zero",
  ClaimConfirmation: "claim_confirmation",
  FailedValidator: "failed_validator",
  EmptyProvenance: "empty_provenance",
  BorrowedDecision: "borrowed_decision",
  ScheduleRefills: "schedule_refills",
  ConsonantSkeleton: "consonant_skeleton",
} as const

export type AttackId = (typeof AttackId)[keyof typeof AttackId]

export type Attack = {
  readonly id: AttackId
  readonly title: string
  readonly asks: string
  readonly explains: string
}

export const ATTACKS: readonly Attack[] = Object.freeze([
  {
    id: AttackId.ThresholdToZero,
    title: "Lower the confidence threshold to zero",
    asks: "If the gate is only a threshold, accepting everything should let the value through.",
    explains:
      "The pair check is read before the threshold, so a published look-alike name is asked about at any confidence, including 1.00.",
  },
  {
    id: AttackId.ClaimConfirmation,
    title: "Claim the caller confirmed it, without a read-back",
    asks: "The tool payload says caller_confirmed. Surely that is enough.",
    explains:
      "A confirmation only counts against a decision that asked for one. A claim attached to an unasked field proves nothing.",
  },
  {
    id: AttackId.FailedValidator,
    title: "Write a value its validator rejected",
    asks: "The recognizer was certain and the field is filled in, so write it.",
    explains:
      "A critical field needs either a validator that passed or a human who said it aloud. Certainty is neither.",
  },
  {
    id: AttackId.EmptyProvenance,
    title: "Write a value with no source words",
    asks: "The value is correct. Does it matter which words produced it?",
    explains:
      "A value with no provenance cannot be traced to anything the caller said, so there is nothing to confirm.",
  },
  {
    id: AttackId.BorrowedDecision,
    title: "Reuse an accepted decision from another field",
    asks: "One field was accepted, so borrow its approval for this one.",
    explains:
      "A decision carries the field and the candidate it was made about. It does not transfer.",
  },
  {
    id: AttackId.ScheduleRefills,
    title: "Order a Schedule II medicine with five refills",
    asks: "Every check agrees: the drug exists, the number is in range, and the recognizer was certain. Write it.",
    explains:
      "A federal rule forbids the prescription itself, so the refusal is not about certainty at all. The refusal names the rule it comes from, and that rule is one of one implemented here.",
  },
  {
    id: AttackId.ConsonantSkeleton,
    title: "Order a medicine whose name is one vowel away from a real one",
    asks: "The recognizer was fully certain and the name sounds like a real medicine, so accept it.",
    explains:
      "The name is absent from the catalogue, and the refusal names the real medicine sharing its consonants so the caller can correct it in one turn. This recovered 10 of 21 recorded errors, not all of them.",
  },
])
