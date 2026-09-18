import { ConfirmationMode, type FieldName, SpellOutStyle } from "@/domain"
import {
  CANCELLING,
  CONFIRMING,
  DENYING,
  leadsWith,
  normalizeAnswer,
} from "./answer-vocabulary"

export const ReadBackState = {
  Idle: "idle",
  AwaitingConfirmation: "awaiting_confirmation",
  Matched: "matched",
  Failed: "failed",
  SpellOut: "spell_out",
  Escalated: "escalated",
  Cancelled: "cancelled",
} as const

export type ReadBackState = (typeof ReadBackState)[keyof typeof ReadBackState]

export const READ_BACK_STATE_LABEL: Readonly<Record<ReadBackState, string>> = Object.freeze({
  idle: "No read-back in flight",
  awaiting_confirmation: "Waiting for the caller to confirm aloud",
  matched: "Confirmed aloud, pending the server's write",
  failed: "The caller did not confirm it",
  spell_out: "Taking it one character at a time",
  escalated: "Handed to a pharmacist",
  cancelled: "The caller called the read-back off",
})

export type ReadBackEvent =
  | { readonly type: "request"; readonly field: FieldName; readonly utterance: string }
  | { readonly type: "heard"; readonly text: string }
  | { readonly type: "enter_spell_out" }
  | { readonly type: "escalate" }
  | { readonly type: "reset" }

export type ReadBackContext = {
  readonly state: ReadBackState
  readonly field: FieldName | null
  readonly expectedValue: string
  readonly utterance: string
  readonly heard: string | null
  readonly attempts: number
  readonly maxAttempts: number
  readonly spellOutStyle: SpellOutStyle
  readonly confirmationMode: ConfirmationMode | null
}

export function initialContext(overrides: Partial<ReadBackContext> = {}): ReadBackContext {
  return {
    state: ReadBackState.Idle,
    field: null,
    expectedValue: "",
    utterance: "",
    heard: null,
    attempts: 0,
    maxAttempts: 3,
    spellOutStyle: SpellOutStyle.None,
    confirmationMode: null,
    ...overrides,
  }
}

function letters(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function repeatsExpectedValue(heard: string, expected: string): boolean {
  const target = letters(expected)
  if (target.length < 3) {
    return false
  }
  return letters(heard) === target
}

export type HeardVerdict = "affirmed" | "denied" | "cancelled" | "unclear"

export function classifyHeard(text: string): HeardVerdict {
  const normalized = normalizeAnswer(text)
  if (leadsWith(normalized, CONFIRMING)) {
    return "affirmed"
  }
  if (leadsWith(normalized, DENYING)) {
    return "denied"
  }
  if (leadsWith(normalized, CANCELLING)) {
    return "cancelled"
  }
  return "unclear"
}

export const OPEN_TO_ANSWER: readonly ReadBackState[] = Object.freeze([
  ReadBackState.AwaitingConfirmation,
  ReadBackState.SpellOut,
])

function afterHearing(context: ReadBackContext, text: string): ReadBackContext {
  if (!OPEN_TO_ANSWER.includes(context.state)) {
    return context
  }
  const verdict = classifyHeard(text)
  if (verdict === "cancelled") {
    return { ...context, state: ReadBackState.Cancelled, heard: text }
  }
  const spelledBack =
    context.state === ReadBackState.SpellOut &&
    repeatsExpectedValue(text, context.expectedValue)
  if (verdict === "affirmed" || spelledBack) {
    return {
      ...context,
      state: ReadBackState.Matched,
      heard: text,
      confirmationMode:
        context.state === ReadBackState.SpellOut
          ? ConfirmationMode.SpellOut
          : ConfirmationMode.ReadBack,
    }
  }
  if (context.attempts >= context.maxAttempts) {
    return { ...context, state: ReadBackState.Escalated, heard: text }
  }
  return { ...context, state: ReadBackState.Failed, heard: text }
}

export function reduceReadBack(
  context: ReadBackContext,
  event: ReadBackEvent,
): ReadBackContext {
  switch (event.type) {
    case "request":
      return {
        ...context,
        state: ReadBackState.AwaitingConfirmation,
        field: event.field,
        utterance: event.utterance,
        heard: null,
        attempts: context.attempts + 1,
      }
    case "heard":
      return afterHearing(context, event.text)
    case "enter_spell_out":
      if (
        context.state === ReadBackState.Matched ||
        context.state === ReadBackState.Escalated ||
        context.state === ReadBackState.Cancelled
      ) {
        return context
      }
      return { ...context, state: ReadBackState.SpellOut }
    case "escalate":
      return { ...context, state: ReadBackState.Escalated, confirmationMode: null }
    case "reset":
      return initialContext({
        maxAttempts: context.maxAttempts,
        spellOutStyle: context.spellOutStyle,
      })
    default:
      return context
  }
}
