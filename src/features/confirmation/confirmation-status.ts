import { type ConfirmationEvidence, ConfirmationReason } from "@/domain"
import type { Status } from "@/shared/ui/primitives/status-chip"

export const ConfirmationStatus = {
  ConfirmedAloud: "CONFIRMED_ALOUD",
  Corrected: "CORRECTED",
  Refused: "REFUSED",
  NameRequired: "NAME_REQUIRED",
  NoAnswer: "NO_ANSWER",
} as const

export type ConfirmationStatus = (typeof ConfirmationStatus)[keyof typeof ConfirmationStatus]

const CORRECTING: readonly string[] = [
  ConfirmationReason.CallerCorrected,
  ConfirmationReason.CallerRepeatMismatch,
  ConfirmationReason.Superseded,
  ConfirmationReason.CallerNamedPartner,
]

export function confirmationStatusOf(evidence: ConfirmationEvidence): ConfirmationStatus {
  if (evidence.verdict === "confirmed") {
    return ConfirmationStatus.ConfirmedAloud
  }
  if (evidence.verdict === "rejected") {
    return CORRECTING.includes(evidence.reasonCode)
      ? ConfirmationStatus.Corrected
      : ConfirmationStatus.Refused
  }
  return evidence.reasonCode === ConfirmationReason.LasaNamedAnswerRequired
    ? ConfirmationStatus.NameRequired
    : ConfirmationStatus.NoAnswer
}

export const CONFIRMATION_STATUS_LABEL: Readonly<Record<ConfirmationStatus, string>> =
  Object.freeze({
    CONFIRMED_ALOUD: "Confirmed aloud by the caller",
    CORRECTED: "The caller corrected it",
    REFUSED: "The caller refused it",
    NAME_REQUIRED: "A yes does not settle a look-alike pair; the caller has to say the name",
    NO_ANSWER: "No usable answer yet",
  })

export const CONFIRMATION_CHIP_STATUS: Readonly<Record<ConfirmationStatus, Status>> =
  Object.freeze({
    CONFIRMED_ALOUD: "written",
    CORRECTED: "asking",
    REFUSED: "alert",
    NAME_REQUIRED: "pair",
    NO_ANSWER: "pending",
  })
