import { REPLAY_ENTRY_HREF, REPLAY_HUB_HREF } from "@/features/judge-demo/entry-routes"

const REPLAY_ANCHOR_HREF = `${REPLAY_HUB_HREF}#replay`

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
    action: "Play the replay.",
    watchFor:
      "Both panels read the drug back. The left one asks which of the two drugs was meant and writes hydromorphone once the caller names it. The right one, the pair rule switched off and nothing else, reads morphine back, hears yes, and orders morphine where hydromorphone was spoken.",
    href: REPLAY_ENTRY_HREF,
    linkLabel: "Open the replay",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "nothing-changed",
    action: "Show that nothing changed.",
    watchFor:
      "Before you press play, both panels already name what will happen. Play it and the panels reach exactly those outcomes. The refusal is not a reaction the page invents at the last moment.",
    href: REPLAY_ANCHOR_HREF,
    linkLabel: "Open the replay",
    needsMicrophone: false,
  }),
  Object.freeze({
    id: "certainty",
    action: "Look for a contradiction on the field card.",
    watchFor:
      "The recognizer reported its highest certainty and the gate still asks again. If those two read as contradicting each other on screen rather than as two independent facts, the interface has failed.",
    href: REPLAY_ANCHOR_HREF,
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
    action: "Open the measurements and read what the pair rule costs beside what it catches.",
    watchFor:
      "How often the gate asked when the value was already right is published beside the catches on the measurements page. A counter that only showed the catches would make the metric one-sided.",
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
    linkLabel: "Start a call",
    needsMicrophone: true,
  }),
  Object.freeze({
    id: "self-correct",
    action: "Say a drug name and correct yourself, once with a marker and once without.",
    watchFor:
      "With a marker (\u201cno wait\u201d, \u201csorry\u201d, \u201cI mean\u201d, \u201cactually\u201d, \u201cscratch that\u201d or \u201cnot X, Y\u201d, followed within four words by the new name), the first name is refused as a value you took back, E_RETRACTED_VALUE. Without a marker, or with the correction spread across two turns, it is not detected: both words were said, so either can be proved spoken, and you reject the wrong one when it is read back. This step is here because a script containing only the parts that work is a sales pitch.",
    href: "/",
    linkLabel: "Start a call",
    needsMicrophone: true,
  }),
])

export const MICROPHONE_FREE_STEPS: number = SCRIPT_STEPS.filter(
  (step) => !step.needsMicrophone,
).length
