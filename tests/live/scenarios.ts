import type { InjectorLog, LineStep } from "./caller-injector"
import type { CallerLineId } from "./lines"

export type Expectation =
  | { readonly kind: "order-text"; readonly pattern: string; readonly label: string }
  | { readonly kind: "interrupted-after-barge-in"; readonly label: string }

export type SmokeScenario = {
  readonly id: string
  readonly title: string
  readonly steps: readonly (LineStep & { readonly line: CallerLineId })[]
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

const READ_BACK = "correct|right\\?|confirm|is that"

const CONTRASTIVE = "hydromorphone.*morphine|morphine.*hydromorphone"

function opening(line: CallerLineId): LineStep & { readonly line: CallerLineId } {
  return { line, trigger: "reply-done", delayMs: 800 }
}

function answer(
  line: CallerLineId,
  whenAgentSaid: string,
): LineStep & { readonly line: CallerLineId } {
  return { line, trigger: "reply-done", whenAgentSaid, delayMs: 600 }
}

function yesTimes(count: number): (LineStep & { readonly line: CallerLineId })[] {
  return Array.from({ length: count }, () => answer("yes", READ_BACK))
}

const COMMITTED: Expectation = {
  kind: "order-text",
  pattern: "Committed",
  label: "the order committed",
}

export const SCENARIOS: readonly SmokeScenario[] = [
  {
    id: "clean-order",
    title: "a clean order commits after its read-backs",
    steps: [opening("order-clean"), ...yesTimes(8)],
    expect: [COMMITTED],
  },
  {
    id: "lasa-named",
    title: "the contrastive question is answered by naming hydromorphone",
    steps: [opening("order-lasa"), answer("name-hydromorphone", CONTRASTIVE), ...yesTimes(8)],
    expect: [
      { kind: "order-text", pattern: "hydromorphone", label: "hydromorphone is in the order" },
      COMMITTED,
    ],
  },
  {
    id: "yeah-no",
    title: "yeah, no is read as a refusal",
    steps: [opening("order-clean"), answer("yeah-no", READ_BACK)],
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
    steps: [opening("order-no-npi"), answer("npi-groups", "NPI"), ...yesTimes(8)],
    expect: [
      { kind: "order-text", pattern: "1234567893", label: "the ten-digit NPI is in the order" },
    ],
  },
  {
    id: "commit-hold",
    title: "commitOrder is refused in hold, then accepted",
    steps: [opening("order-clean"), answer("commit-early", READ_BACK), ...yesTimes(10)],
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
    reason: `${scenario.id}: not observed: ${missing.map((e) => e.label).join(", ")}; ${log.played.length} of ${scenario.steps.length} caller lines played; last agent line: ${lastAgent?.text ?? "none"}`,
  }
}
