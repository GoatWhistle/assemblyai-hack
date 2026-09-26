import { signatureOf } from "@/features/gate-banner/signature"
import {
  DEMO_ARMS,
  type DemoArm,
  type DemoPhase,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SPOKEN_TRUTH,
} from "../demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "../scenario"

export type StripTone = "undecided" | "lasa" | "threshold" | "committed" | "refused"

export type StripLine = {
  readonly text: string
  readonly code: string | null
  readonly tone: StripTone
}

const PHASES: readonly DemoPhase[] = ["resting", "asked", "settled"]

const certainty = RECOGNIZER_CERTAINTY.toFixed(2)

const choice = signatureOf(LASA_CANDIDATE, LASA_DECISION).candidates.join(" or ")

function writtenName(arm: DemoArm): string {
  return arm.written === null ? "nothing" : String(arm.written.value)
}

function pairRuleLines(arm: DemoArm): Readonly<Record<DemoPhase, StripLine>> {
  return {
    resting: {
      text: "Will ask which of the two names was meant, and wait for a name",
      code: null,
      tone: "undecided",
    },
    asked: {
      text: `RE-ASK at certainty ${certainty}: ${choice}? Only a spoken name answers`,
      code: arm.decision.reasonCode,
      tone: "lasa",
    },
    settled: {
      text: `${writtenName(arm)} written: the drug that was said`,
      code: arm.answer.reasonCode,
      tone: "committed",
    },
  }
}

function plainLines(arm: DemoArm): Readonly<Record<DemoPhase, StripLine>> {
  return {
    resting: {
      text: `Will read ${RECOGNIZED_AS} back and take a yes`,
      code: null,
      tone: "undecided",
    },
    asked: {
      text: `Reads ${RECOGNIZED_AS} back at certainty ${certainty}; a yes will confirm it`,
      code: arm.decision.reasonCode,
      tone: "threshold",
    },
    settled: {
      text: `${writtenName(arm)} written, where ${SPOKEN_TRUTH} was said`,
      code: arm.answer.reasonCode,
      tone: "refused",
    },
  }
}

export type StripArm = {
  readonly id: DemoArm["id"]
  readonly title: string
  readonly tag: string
  readonly lines: Readonly<Record<DemoPhase, StripLine>>
}

export const STRIP_ARMS: readonly StripArm[] = DEMO_ARMS.map((arm) =>
  arm.id === "pair-rule"
    ? { id: arm.id, title: arm.title, tag: "shipped", lines: pairRuleLines(arm) }
    : { id: arm.id, title: arm.title, tag: "comparison only", lines: plainLines(arm) },
)

export const STRIP_PHASES = PHASES
