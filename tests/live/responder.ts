import type { CallerLineId } from "./lines"

export type ResponderRule = {
  readonly whenAgentAsks: string
  readonly line: string
  readonly evenOnReadBack?: boolean
}

export type Responder = {
  readonly rules: readonly ResponderRule[]
  readonly readBack: string
  readonly ask: string
  readonly fallback: string
  readonly delayMs: number
  readonly maxLines: number
}

export const READ_BACK = "correct|right\\?|confirm|is that"

export const CONTRASTIVE = "hydromorphone.*morphine|morphine.*hydromorphone"

const ASKS =
  "what is|what's|what are|please (provide|give|state|tell|say|repeat|spell)|could you|can you|may i have|i need|go ahead"

export type OrderLines = "clean" | "lasa"

function rule(whenAgentAsks: string, line: CallerLineId): ResponderRule {
  return { whenAgentAsks, line }
}

export function responderFor(
  order: OrderLines,
  first: readonly ResponderRule[] = [],
): Responder {
  return {
    rules: [
      ...first,
      rule("directions|instructions|\\bsig\\b|how often|frequency|how should", `sig-${order}`),
      rule("patient", "patient"),
      rule("\\bNPI\\b", "npi"),
      rule("\\bDEA\\b", "dea"),
      rule("drug|medication|medicine", `drug-${order}`),
      rule("strength|dose", `strength-${order}`),
      rule("\\bform\\b", `form-${order}`),
      rule("route", `route-${order}`),
      rule("quantity|how many", `quantity-${order}`),
      rule("refill", "refills"),
      rule("days", `days-${order}`),
    ],
    readBack: READ_BACK,
    ask: ASKS,
    fallback: "yes",
    delayMs: 1500,
    maxLines: 30,
  }
}

export function namedAnswer(line: CallerLineId): ResponderRule {
  return { whenAgentAsks: CONTRASTIVE, line, evenOnReadBack: true }
}

export function responderLines(responder: Responder): readonly string[] {
  return [...responder.rules.map((r) => r.line), responder.fallback]
}
