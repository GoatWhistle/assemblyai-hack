import type { FieldName } from "../enums"

export type FieldWitnessVerdict = "witnessed" | "not_witnessed" | "unavailable"

export type FieldWitness = {
  readonly field: FieldName
  readonly verdict: FieldWitnessVerdict
  readonly vendorTranscript: string | null
  readonly detail: string
}

export type OrderWitness = {
  readonly source: string
  readonly checkedAt: string
  readonly vendorSessionIds: readonly string[]
  readonly vendorUserTurnCount: number
  readonly unavailableReason: string | null
  readonly fields: readonly FieldWitness[]
}

export const WITNESS_BOUNDARY_NOTE =
  "witnessed means the vendor's own recognizer, on the agent socket, produced a caller transcript that supports the value; the server fetched that transcript with its own key and the browser has no write access to it. It does not prove the audio came from a human rather than from a client sending synthesised speech to both sockets"
