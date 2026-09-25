import type { FieldName, FieldWitnessVerdict, OrderWitness } from "@/domain"
import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"

export const WITNESS_LABEL: Readonly<Record<FieldWitnessVerdict, string>> = Object.freeze({
  witnessed: "heard by AssemblyAI too",
  not_witnessed: "not in the vendor's transcript",
  unavailable: "vendor record unavailable",
})

const WITNESS_TONE: Readonly<Record<FieldWitnessVerdict, ChipTone>> = Object.freeze({
  witnessed: "plain",
  not_witnessed: "pending",
  unavailable: "neutral",
})

const VERDICTS: readonly string[] = Object.keys(WITNESS_LABEL)

export function readOrderWitness(value: unknown): OrderWitness | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const record = value as { fields?: unknown; unavailableReason?: unknown }
  if (!Array.isArray(record.fields)) {
    return null
  }
  const wellFormed = record.fields.every(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { field?: unknown }).field === "string" &&
      VERDICTS.includes(String((entry as { verdict?: unknown }).verdict)),
  )
  if (!wellFormed) {
    return null
  }
  if (record.unavailableReason !== null && typeof record.unavailableReason !== "string") {
    return null
  }
  return value as OrderWitness
}

export function witnessVerdictFor(
  witness: OrderWitness | null | undefined,
  field: FieldName,
): FieldWitnessVerdict | null {
  if (witness === null || witness === undefined || !Array.isArray(witness.fields)) {
    return null
  }
  const entry = witness.fields.find((candidate) => candidate.field === field)
  if (entry !== undefined) {
    return entry.verdict
  }
  return witness.unavailableReason === null ? null : "unavailable"
}

export type WitnessBadgeProps = {
  readonly witness: OrderWitness | null | undefined
  readonly field: FieldName
}

export function WitnessBadge({ witness, field }: WitnessBadgeProps) {
  const verdict = witnessVerdictFor(witness, field)
  if (verdict === null) {
    return null
  }
  const entry = witness?.fields.find((candidate) => candidate.field === field)
  const detail = entry?.detail ?? witness?.unavailableReason ?? undefined
  return (
    <Chip tone={WITNESS_TONE[verdict]} title={detail}>
      {WITNESS_LABEL[verdict]}
    </Chip>
  )
}
