import type { ComponentType } from "react"
import { BuyerSlide } from "./buyer-slide"
import { CatchSlide } from "./catch-slide"
import { ClosingSlide } from "./closing-slide"
import { DemoSlide } from "./demo-slide"
import { FailureSlide } from "./failure-slide"
import { InvariantSlide } from "./invariant-slide"
import { ProblemSlide } from "./problem-slide"
import { ProofSlide } from "./proof-slide"
import { RecognizerSlide } from "./recognizer-slide"
import { RuleSlide } from "./rule-slide"
import { StackSlide } from "./stack-slide"
import { TitleSlide } from "./title-slide"

export type DeckSlide = {
  readonly id: string
  readonly title: string
  readonly source?: string
  readonly tone?: "violet"
  readonly hero?: boolean
  readonly cover?: boolean
  readonly body: ComponentType
}

export const SLIDES: readonly DeckSlide[] = [
  {
    id: "title",
    title: "Readback",
    tone: "violet",
    cover: true,
    body: TitleSlide,
  },
  {
    id: "problem",
    title: "In prescription intake, a recognition error does not look like an error",
    source:
      "AssemblyAI, Universal-3.5 Pro Realtime (23 June 2026) and The Voice Agent Accuracy Problem Nobody Benchmarks (8 September 2026); vendor figures, not measured by us",
    body: ProblemSlide,
  },
  {
    id: "failure",
    title: "The dangerous error passes every usual check",
    source:
      "ISMP Medication Safety Alert, 18 May 2017; the mishearing is staged by the synthesised replay at /demo, not a recorded recognizer output",
    body: FailureSlide,
  },
  {
    id: "rule",
    title: "A published list outranks the recognizer's certainty",
    source:
      "branch order in src/gate/decide.ts; npx tsx scripts/measure/ismp-coverage.ts over the ISMP List of Confused Drug Names, updated through February 2023",
    body: RuleSlide,
  },
  {
    id: "demo",
    title: "Two arms, one flag apart",
    source:
      "the synthesised replay at /demo, run through the shipped gate; not a recorded recognizer output",
    body: DemoSlide,
  },
  {
    id: "proof",
    title: "Where arithmetic exists, voice is not spent",
    source:
      "npx tsx scripts/measure/audit-checksums.ts 200, every single-digit substitution and adjacent transposition of 200 valid identifiers of each kind, 32 080 mutations",
    body: ProofSlide,
  },
  {
    id: "stack",
    title: "Built on AssemblyAI, with no proxy in between",
    source:
      "src/realtime/tokens.ts, src/agent/session-config.ts, src/agent/tools.ts, app/api/tokens, app/api/tools",
    body: StackSlide,
  },
  {
    id: "invariant",
    title: "Enforced by code, not by the prompt",
    source:
      "make gate-mutation, as recorded in eval/REPORT.md; src/gate/confirm.ts; the attack console at /how-it-works",
    body: InvariantSlide,
  },
  {
    id: "catch",
    title: "The catch and its cost, at equal weight",
    source:
      "npx tsx scripts/measure/ab-gate.ts, 20 seeded pair mishearings; npx tsx scripts/measure/coverage-matrix.ts, correct names from synthesised speech through the live recognizer",
    body: CatchSlide,
  },
  {
    id: "recognizer",
    title: "What the real recognizer gets wrong, and what is not measured",
    source:
      "npx tsx scripts/measure/coverage-matrix.ts over the control and native 16 kHz runs; BENCHMARK_ROWS in src/stats for the dashes",
    body: RecognizerSlide,
  },
  {
    id: "buyer",
    title: "Regulation already pays for the read-back",
    source:
      "ICAO Annex 11 §3.7.3.1; The Joint Commission, National Patient Safety Goals, NPSG.02.01.01",
    body: BuyerSlide,
  },
  {
    id: "closing",
    title: "The recognizer proposes. A validator or a regulator's list decides.",
    tone: "violet",
    hero: true,
    body: ClosingSlide,
  },
]
