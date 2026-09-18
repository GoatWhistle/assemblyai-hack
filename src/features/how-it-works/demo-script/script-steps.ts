export type ScriptStep = {
  readonly id: string
  readonly action: string
  readonly watchFor: string
  readonly href: string | null
  readonly linkLabel: string | null
  readonly needsMicrophone: boolean
}

export const SCRIPT_STEPS: readonly ScriptStep[] = Object.freeze([
  Object.freeze({
    id: "play",
    action: "Play the recorded session.",
    watchFor:
      "The left panel refuses to write. The right panel, one policy flag apart, orders a beta blocker where an ACE inhibitor was spoken.",
    href: "/demo",
    linkLabel: "Open the replay",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "nothing-changed",
    action: "Show that nothing changed.",
    watchFor:
      "Before you press play, both panels already name what will happen. Play it and the panels reach exactly those outcomes. The refusal is not a reaction the page invents at the last moment.",
    href: "/demo",
    linkLabel: "Open the replay",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "certainty",
    action: "Look for a contradiction on the field card.",
    watchFor:
      "The recognizer reported its highest certainty and the gate still asks again. If those two read as contradicting each other on screen rather than as two independent facts, the interface has failed.",
    href: "/demo",
    linkLabel: "Open the replay",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "attack",
    action: "Attack the gate from the console below.",
    watchFor:
      "Each button builds a real candidate and calls the only constructor that can write a field. The refusal you read is the string the gate raised, not a message written for this page.",
    href: null,
    linkLabel: null,
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "counters",
    action: "Read the refusal counter while an order is in progress.",
    watchFor:
      "How often the gate asked when the value was already right is published beside the catches. A counter that only showed the catches would make the metric one-sided.",
    href: "/metrics",
    linkLabel: "Open the measurements",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "interrupt",
    action: "Interrupt the agent mid-sentence.",
    watchFor:
      "Nothing reaches the recognizer between the reply starting and the reply finishing, and a turn that matches the agent's own last line is discarded. Watch the dropped-turn count rather than the transcript: a phantom turn would put words nobody said into a field's provenance.",
    href: "/",
    linkLabel: "Take an order",
    needsMicrophone: true,
  }),
  Object.freeze({
    id: "self-correct",
    action: "Say a drug name and correct yourself in the same breath.",
    watchFor:
      "We do not detect this, and the read-back is the mitigation rather than the fix. Both words are in the turn, so either can be proved spoken; you reject the value when it is read back to you. This step is here because a script containing only the parts that work is a sales pitch.",
    href: "/",
    linkLabel: "Take an order",
    needsMicrophone: true,
  }),
])

export const MICROPHONE_FREE_STEPS: number = SCRIPT_STEPS.filter(
  (step) => !step.needsMicrophone,
).length
