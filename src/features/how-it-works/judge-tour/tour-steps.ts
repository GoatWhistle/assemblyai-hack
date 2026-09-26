export type TourStep = {
  readonly id: string
  readonly seconds: number
  readonly click: string
  readonly expect: string
  readonly href: string
  readonly go: string
  readonly needsMicrophone: boolean
}

export const TOUR_STEPS: readonly TourStep[] = Object.freeze([
  {
    id: "replay",
    seconds: 15,
    click: "Open the replay.",
    expect:
      "It starts by itself. At the decision the banner reads RE-ASK with E_LASA_HIT at certainty 1.00, candidates Hydromorphone / Morphine.",
    href: "/demo?autoplay=1#replay",
    go: "Open the replay",
    needsMicrophone: false,
  },
  {
    id: "arms",
    seconds: 10,
    click: "Read the two panels side by side.",
    expect:
      "The shipped arm asks which of the two drugs was meant and writes hydromorphone only after the caller names it. The same policy with the pair rule switched off reads morphine back, takes a yes, and orders morphine.",
    href: "/demo#replay",
    go: "Read the two panels",
    needsMicrophone: false,
  },
  {
    id: "compare",
    seconds: 15,
    click: "Open the comparison.",
    expect:
      "Six moments: what was said, what was heard, the recognizer's certainty, the gate's verdict and what would have been written without it.",
    href: "/compare",
    go: "Open the comparison",
    needsMicrophone: false,
  },
  {
    id: "attack",
    seconds: 15,
    click: "Try to forge a value from the attack console.",
    expect: "Every attempt is refused by the only constructor that can write a field.",
    href: "/how-it-works#attack",
    go: "Open the attack console",
    needsMicrophone: false,
  },
  {
    id: "metrics",
    seconds: 15,
    click: "Open the measurements.",
    expect:
      "Every figure carries its input, command, n and date; what was not measured shows a dash, never a zero.",
    href: "/metrics",
    go: "Open the measurements",
    needsMicrophone: false,
  },
  {
    id: "live",
    seconds: 20,
    click: "Start a live call and say: Hydromorphone, two milligrams.",
    expect:
      "Expected, not yet observed on a recorded live call: the agent names hydromorphone and every drug the published list pairs with it, and waits for a name, not a yes. The telemetry shows both sockets' frames and the decision log gains E_LASA_HIT.",
    href: "/",
    go: "Start a call",
    needsMicrophone: true,
  },
])

export const TOUR_SECONDS = TOUR_STEPS.reduce((sum, step) => sum + step.seconds, 0)
