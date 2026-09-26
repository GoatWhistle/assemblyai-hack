import { z } from "zod"
import { reconcileValue, type TurnRecord } from "@/confirmation"
import type { FieldName, FieldWitness } from "@/domain"

export const WITNESS_SOURCE =
  "GET https://agents.us.assemblyai.com/v1/sessions?agent_id={agent} lists the vendor sessions of this call's own agent; GET /v1/sessions/{id} returns artifacts[] whose timeline entry is a pre-signed JSON with turns[] carrying user_transcript, user_confidence, agent_text, status and trigger. Observed 25 September 2026 (scripts/report/probe-witness.ts): the artifacts list was empty 0 s and 2 s after session.ended and present at 5 s"

const timelineTurnSchema = z
  .object({
    turn_id: z.union([z.string(), z.number()]).optional(),
    user_transcript: z.string().nullable().optional(),
    user_confidence: z.number().nullable().optional(),
    agent_text: z.string().nullable().optional(),
    status: z.string().optional(),
    trigger: z.string().optional(),
  })
  .passthrough()

const sessionTimelineSchema = z
  .object({ session_id: z.string().optional(), turns: z.array(timelineTurnSchema).optional() })
  .passthrough()

export type SessionTimeline = z.infer<typeof sessionTimelineSchema>

export function parseTimeline(raw: unknown): SessionTimeline | null {
  const parsed = sessionTimelineSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function vendorUserTranscripts(
  timelines: readonly SessionTimeline[],
): readonly string[] {
  return timelines.flatMap((timeline) =>
    (timeline.turns ?? [])
      .map((turn) => (turn.user_transcript ?? "").trim())
      .filter((text) => text.length > 0),
  )
}

function asTurn(transcript: string): TurnRecord {
  return { turnOrder: 0, transcript, isFormatted: true, words: [] }
}

function windowsOf(transcripts: readonly string[]): readonly string[] {
  const pairs = transcripts
    .slice(0, -1)
    .map((text, index) => `${text} ${transcripts[index + 1] ?? ""}`.trim())
  return [...transcripts, ...pairs]
}

export type WitnessedField = {
  readonly field: FieldName
  readonly value: string | number
}

function witnessField(field: WitnessedField, transcripts: readonly string[]): FieldWitness {
  const value = String(field.value)
  let closest: { readonly text: string; readonly missing: readonly string[] } | null = null
  for (const text of windowsOf(transcripts)) {
    const reconciliation = reconcileValue({ value, turn: asTurn(text) })
    if (reconciliation.supported) {
      return {
        field: field.field,
        verdict: "witnessed",
        vendorTranscript: text,
        detail: `the vendor's own transcript "${text}" supports "${value}"`,
      }
    }
    if (closest === null || reconciliation.unsupportedTokens.length < closest.missing.length) {
      closest = { text, missing: reconciliation.unsupportedTokens }
    }
  }
  return {
    field: field.field,
    verdict: "not_witnessed",
    vendorTranscript: closest?.text ?? null,
    detail:
      transcripts.length === 0
        ? `the vendor's timeline holds no caller transcript, so nothing it heard supports "${value}"`
        : `none of the ${transcripts.length} caller turns in the vendor's timeline supports "${value}"${closest === null || closest.missing.length === 0 ? "" : `; closest lacks ${closest.missing.join(", ")}`}`,
  }
}

export function witnessOrderFields(
  fields: readonly WitnessedField[],
  timelines: readonly SessionTimeline[],
): readonly FieldWitness[] {
  const transcripts = vendorUserTranscripts(timelines)
  return fields.map((field) => witnessField(field, transcripts))
}

export function unavailableFields(
  fields: readonly WitnessedField[],
  reason: string,
): readonly FieldWitness[] {
  return fields.map((field) => ({
    field: field.field,
    verdict: "unavailable",
    vendorTranscript: null,
    detail: reason,
  }))
}
