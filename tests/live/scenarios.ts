import type { InjectorLog, LineStep } from "./caller-injector"
import type { CallerLineId } from "./lines"
import { CONTRASTIVE, namedAnswer, READ_BACK, type Responder, responderFor } from "./responder"

export type Expectation =
  | { readonly kind: "order-text"; readonly pattern: string; readonly label: string }
  | { readonly kind: "interrupted-after-barge-in"; readonly label: string }

export type SmokeScenario = {
  readonly id: string
  readonly title: string
  readonly steps: readonly (LineStep & { readonly line: CallerLineId })[]
  readonly responder: Responder
  readonly expect: readonly Expectation[]
}

export type RunObservation = {
  readonly orderText: string
  readonly log: InjectorLog | null
}

export type RunVerdict = {
  readonly outcome: "completed" | "failed" | "inconclusive"
  readonly reason: string
}

function opening(line: CallerLineId): LineStep & { readonly line: CallerLineId } {
  return { line, trigger: "reply-done", delayMs: 800 }
}

function answer(
  line: CallerLineId,
  whenAgentSaid: string,
): LineStep & { readonly line: CallerLineId } {
  return { line, trigger: "reply-done", whenAgentSaid, delayMs: 600 }
}

const COMMITTED_PATTERN = "Committed"

export function orderCommitted(observation: RunObservation): boolean {
  return new RegExp(COMMITTED_PATTERN, "i").test(observation.orderText)
}

const COMMITTED: Expectation = {
  kind: "order-text",
  pattern: COMMITTED_PATTERN,
  label: "the order committed",
}

export const SCENARIOS: readonly SmokeScenario[] = [
  {
    id: "clean-order",
    title: "a clean order commits after its read-backs",
    steps: [opening("order-clean")],
    responder: responderFor("clean"),
    expect: [COMMITTED],
  },
  {
    id: "lasa-named",
    title: "the contrastive question is answered by naming hydromorphone",
    steps: [opening("order-lasa"), answer("name-hydromorphone", CONTRASTIVE)],
    responder: responderFor("lasa", [namedAnswer("name-hydromorphone")]),
    expect: [
      { kind: "order-text", pattern: "hydromorphone", label: "hydromorphone is in the order" },
      COMMITTED,
    ],
  },
  {
    id: "yeah-no",
    title: "yeah, no is read as a refusal",
    steps: [opening("order-clean"), answer("yeah-no", READ_BACK)],
    responder: responderFor("clean"),
    expect: [
      {
        kind: "order-text",
        pattern: "E_CALLER_NEGATED|REFUSED",
        label: "the read-back was refused, not confirmed",
      },
    ],
  },
  {
    id: "barge-in",
    title: "the caller cuts the agent off mid-reply",
    steps: [
      opening("order-clean"),
      { line: "barge-in", trigger: "reply-started", delayMs: 1500 },
    ],
    responder: responderFor("clean"),
    expect: [
      {
        kind: "interrupted-after-barge-in",
        label: "a reply ended interrupted after the barge-in",
      },
    ],
  },
  {
    id: "npi-groups",
    title: "an NPI dictated in digit groups arrives whole",
    steps: [opening("order-no-npi"), answer("npi-groups", "NPI")],
    responder: responderFor("clean"),
    expect: [
      { kind: "order-text", pattern: "1234567893", label: "the ten-digit NPI is in the order" },
    ],
  },
  {
    id: "commit-hold",
    title: "commitOrder is refused in hold, then accepted",
    steps: [opening("order-clean"), answer("commit-early", READ_BACK)],
    responder: responderFor("clean"),
    expect: [
      {
        kind: "order-text",
        pattern: "The hold refused commitOrder",
        label: "the early commit was refused in hold",
      },
      COMMITTED,
    ],
  },
]

function met(expectation: Expectation, observation: RunObservation): boolean {
  if (expectation.kind === "order-text") {
    return new RegExp(expectation.pattern, "i").test(observation.orderText)
  }
  const log = observation.log
  const barge = log?.played.find((entry) => entry.line === "barge-in")
  if (log === null || barge === undefined) {
    return false
  }
  return log.events.some(
    (event) =>
      event.type === "reply.done" && event.status === "interrupted" && event.atMs >= barge.atMs,
  )
}

export function judgeRun(scenario: SmokeScenario, observation: RunObservation): RunVerdict {
  const log = observation.log
  if (log === null) {
    return {
      outcome: "inconclusive",
      reason: "the caller injector never installed in the page",
    }
  }
  if (log.errors.length > 0) {
    return {
      outcome: "inconclusive",
      reason: `the caller injector failed: ${log.errors.join("; ")}`,
    }
  }
  const missing = scenario.expect.filter((expectation) => !met(expectation, observation))
  if (missing.length === 0) {
    return {
      outcome: "completed",
      reason: `${scenario.id}: ${scenario.expect.map((e) => e.label).join(", ")}`,
    }
  }
  const lastAgent = [...log.events].reverse().find((event) => event.type === "transcript.agent")
  return {
    outcome: "failed",
    reason: `${scenario.id}: not observed: ${missing.map((e) => e.label).join(", ")}; ${log.played.length} caller lines played; last agent line: ${lastAgent?.text ?? "none"}`,
  }
}
