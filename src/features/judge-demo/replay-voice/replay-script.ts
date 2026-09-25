import type { FieldName } from "@/domain"
import { DECISION_AT_MS, DEMO_ARMS, NAMED_ANSWER } from "../demo-arms"
import { LASA_CANDIDATE, NAMED_ANSWER_AT_MS } from "../scenario"

export type ReplayLine = {
  readonly id: string
  readonly who: "caller" | "agent"
  readonly atMs: number
  readonly untilMs: number
  readonly text: string
  readonly field: FieldName | null
}

const GATED_LINE = DEMO_ARMS.find((arm) => arm.id === "pair-rule")?.agentLine ?? ""

export const REPLAY_LINES: readonly ReplayLine[] = Object.freeze([
  {
    id: "caller-order",
    who: "caller",
    atMs: 6800,
    untilMs: 9000,
    text: "Hydromorphone, two milligrams IV, every four hours as needed.",
    field: null,
  },
  {
    id: "agent-reask",
    who: "agent",
    atMs: DECISION_AT_MS,
    untilMs: NAMED_ANSWER_AT_MS - 400,
    text: GATED_LINE,
    field: LASA_CANDIDATE.field,
  },
  {
    id: "caller-correct",
    who: "caller",
    atMs: NAMED_ANSWER_AT_MS,
    untilMs: NAMED_ANSWER_AT_MS + 1200,
    text: NAMED_ANSWER,
    field: null,
  },
])

export function lineAt(lines: readonly ReplayLine[], clockMs: number): ReplayLine | null {
  return lines.find((line) => clockMs >= line.atMs && clockMs < line.untilMs) ?? null
}

export function highlightedField(
  lines: readonly ReplayLine[],
  clockMs: number,
): FieldName | null {
  const line = lineAt(lines, clockMs)
  return line !== null && line.who === "agent" ? line.field : null
}
