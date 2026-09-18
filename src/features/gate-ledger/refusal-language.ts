import { RefusalReason } from "./refusal-tally"

export type RefusalCopy = {
  readonly label: string
  readonly absenceNote: string
  readonly tone: "asking" | "lasa"
}

export const REFUSAL_COPY: Readonly<Record<RefusalReason, RefusalCopy>> = Object.freeze({
  [RefusalReason.BelowThreshold]: {
    label: "Recognizer certainty under this field's threshold",
    absenceNote: "No decision has been made, so this is absence rather than a clean run.",
    tone: "asking",
  },
  [RefusalReason.ValidatorFailed]: {
    label: "An independent validator refused the value",
    absenceNote: "No decision has been made, so this is absence rather than a clean run.",
    tone: "asking",
  },
  [RefusalReason.LasaPair]: {
    label: "Sent back for confirming: on a regulator-published look-alike pair",
    absenceNote: "No decision has been made, so this is absence rather than a clean run.",
    tone: "lasa",
  },
  [RefusalReason.PolicyReadBack]: {
    label: "Field policy requires a spoken read-back",
    absenceNote: "No decision has been made, so this is absence rather than a clean run.",
    tone: "asking",
  },
  [RefusalReason.AttemptsExhausted]: {
    label: "Attempts exhausted: spell-out, pharmacist or left blank",
    absenceNote: "No decision has been made, so this is absence rather than a clean run.",
    tone: "asking",
  },
})

export const LASA_OUTRANKS_NOTE =
  "A look-alike pair is asked again even when the recognizer's own certainty sits at or above the field threshold. Certainty describes acoustics; it cannot tell one real drug name from another that sounds like it."

export const RE_ASK_IS_NOT_A_FINDING =
  "Every count here is a question asked, not an error found. A re-ask says a value could not be proved yet, and on a correct value that question is the cost of the idea rather than a catch. Which of these questions landed on a value that was already right is measured on the evaluation set, not guessed at from this session."

export const METHOD_NOTE =
  "Counted in this browser from the decisions the gate returned for this session. Not an evaluation figure: the published catch and false-ask rates live on the measurements page with the command and the set that produced them."
