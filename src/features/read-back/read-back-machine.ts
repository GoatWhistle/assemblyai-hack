import { ConfirmationMode, type FieldName, SpellOutStyle } from "@/domain"

export const ReadBackState = {
  Idle: "idle",
  AwaitingConfirmation: "awaiting_confirmation",
  Matched: "matched",
  Failed: "failed",
  SpellOut: "spell_out",
  Escalated: "escalated",
} as const

export type ReadBackState = (typeof ReadBackState)[keyof typeof ReadBackState]

export const READ_BACK_STATE_LABEL: Readonly<Record<ReadBackState, string>> = Object.freeze({
  idle: "No read-back in flight",
  awaiting_confirmation: "Waiting for the caller to confirm aloud",
  matched: "Confirmed aloud and written",
  failed: "The caller did not confirm it",
  spell_out: "Taking it one character at a time",
  escalated: "Handed to a pharmacist",
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

const AFFIRMATIVE = [
  "yes",
  "yeah",
  "yep",
  "correct",
  "that is right",
  "thats right",
  "right",
  "confirmed",
  "affirmative",
]

const NEGATIVE = ["no", "nope", "negative", "wrong", "incorrect", "not right"]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export type HeardVerdict = "affirmed" | "denied" | "restated" | "unclear"

export function classifyHeard(text: string, expectedValue: string): HeardVerdict {
  const normalized = normalize(text)
  if (normalized.length === 0) {
    return "unclear"
  }
  if (NEGATIVE.some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    return "denied"
  }
  if (AFFIRMATIVE.some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    return "affirmed"
  }
  const expected = normalize(expectedValue)
  if (expected.length > 0 && normalized.includes(expected)) {
    return "restated"
  }
  return "unclear"
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
    case "heard": {
      if (
        context.state !== ReadBackState.AwaitingConfirmation &&
        context.state !== ReadBackState.SpellOut
      ) {
        return context
      }
      const verdict = classifyHeard(event.text, context.expectedValue)
      if (verdict === "affirmed" || verdict === "restated") {
        return {
          ...context,
          state: ReadBackState.Matched,
          heard: event.text,
          confirmationMode:
            context.state === ReadBackState.SpellOut
              ? ConfirmationMode.SpellOut
              : ConfirmationMode.ReadBack,
        }
      }
      if (context.attempts >= context.maxAttempts) {
        return { ...context, state: ReadBackState.Escalated, heard: event.text }
      }
      return { ...context, state: ReadBackState.Failed, heard: event.text }
    }
    case "enter_spell_out":
      if (
        context.state === ReadBackState.Matched ||
        context.state === ReadBackState.Escalated
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
