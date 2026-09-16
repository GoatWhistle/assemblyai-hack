export type DemoArm = {
  readonly id: "gated" | "ungated"
  readonly title: string
  readonly note: string
  readonly agentLine: string
  readonly outcomeLabel: string
  readonly outcomeValue: string
  readonly outcomeBody: string
  readonly restingValue: string
  readonly restingNote: string
}

export const SPOKEN_TRUTH = "Lisinopril"
export const RECOGNIZED_AS = "Bisoprolol"
export const RECOGNIZER_CERTAINTY = 0.99

export const DEMO_ARMS: readonly DemoArm[] = [
  {
    id: "gated",
    title: "Gate on",
    note: "The shipped configuration. A drug name inside a published pair triggers a re-ask regardless of certainty.",
    agentLine:
      "I heard Bisoprolol. That name is on the published confused-drug-names list together with Lisinopril. To be certain: did you say Bisoprolol or Lisinopril?",
    outcomeLabel: "What entered the order",
    outcomeValue: "Nothing yet",
    outcomeBody:
      "The field stays empty and the agent names both alternatives from the ISMP list. There is no code path that writes an unconfirmed value, so the refusal is structural rather than a policy the model chose to follow.",
    restingValue: "Nothing will enter",
    restingNote: "The published pair forces a re-ask before any value is written.",
  },
  {
    id: "ungated",
    title: "Gate off",
    note: "The same audio with the gate disabled, which is what a confidence threshold alone would do here.",
    agentLine: "Got it, drug name is bisoprolol.",
    outcomeLabel: "What entered the order",
    outcomeValue: "bisoprolol 10 mg",
    outcomeBody:
      "A beta blocker was ordered where an ACE inhibitor was spoken. Certainty was 0.99, the catalogue lookup passed, and every numeric check agreed. This is the failure the product exists to prevent, and no threshold catches it.",
    restingValue: "bisoprolol 10 mg will enter",
    restingNote:
      "The wrong medicine, accepted because certainty was high and every check passed.",
  },
]

export type DemoStage = {
  readonly atMs: number
  readonly label: string
}

export const DEMO_STAGES: readonly DemoStage[] = [
  { atMs: 0, label: "Session opens, both sockets carry short-lived tokens" },
  { atMs: 6800, label: "Caller says the drug name" },
  { atMs: 8400, label: "Recognizer finalises the turn at 0.99 certainty" },
  { atMs: 9100, label: "Gate reads the published pair table" },
  { atMs: 9600, label: "Gate on: re-ask fires. Gate off: value is written" },
  { atMs: 16200, label: "Caller corrects to Lisinopril and spells it" },
  { atMs: 18400, label: "Both sockets close after their confirmations" },
]

export const DEMO_DURATION_MS = 18600
