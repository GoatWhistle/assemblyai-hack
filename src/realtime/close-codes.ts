export const CloseCode = {
  Normal: 1000,
  GoingAway: 1001,
  MalformedChunks: 3007,
  ThreeHourCap: 3008,
  SessionLimit: 3009,
} as const

export type CloseCode = (typeof CloseCode)[keyof typeof CloseCode]

export type CloseSeverity = "normal" | "warning" | "alert"

export type CloseExplanation = {
  readonly code: number
  readonly severity: CloseSeverity
  readonly label: string
  readonly explanation: string
  readonly operatorAction: string
}

const EXPLANATIONS: Readonly<Record<number, Omit<CloseExplanation, "code">>> = Object.freeze({
  1000: {
    severity: "normal",
    label: "Closed cleanly",
    explanation: "The session ended after session.end was acknowledged.",
    operatorAction: "Nothing to do.",
  },
  1001: {
    severity: "normal",
    label: "Page went away",
    explanation: "The tab was closed or navigated away from.",
    operatorAction: "Nothing to do; the exit path still sent session.end.",
  },
  3007: {
    severity: "warning",
    label: "Malformed audio chunks",
    explanation:
      "A chunk fell outside the 50-1000 ms window the socket accepts, so the stream was rejected.",
    operatorAction:
      "Check the chunker duration and the resampled sample rate before reconnecting.",
  },
  3008: {
    severity: "alert",
    label: "Three-hour session cap",
    explanation:
      "A streaming session is closed automatically at three hours and is billed for the whole time the socket was open.",
    operatorAction:
      "Alert-worthy on the first occurrence: a socket was left open far too long.",
  },
  3009: {
    severity: "alert",
    label: "Session limit exceeded",
    explanation:
      "The account allows five new sessions per minute on the free tier and this run exceeded it.",
    operatorAction: "Alert-worthy on the first occurrence: space runs about 24 seconds apart.",
  },
})

export function explainClose(code: number, reason: string): CloseExplanation {
  const known = EXPLANATIONS[code]
  if (known !== undefined) {
    return { code, ...known }
  }
  return {
    code,
    severity: code >= 3000 ? "warning" : "normal",
    label: `Closed with ${code}`,
    explanation:
      reason.length > 0
        ? `The socket reported: ${reason}`
        : "The socket closed without a documented reason.",
    operatorAction:
      "Read the Error frame that preceded the close; the reason field is truncated.",
  }
}

export function isAlertWorthy(code: number): boolean {
  return code === CloseCode.ThreeHourCap || code === CloseCode.SessionLimit
}
