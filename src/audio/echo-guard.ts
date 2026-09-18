export const ECHO_MATCH_THRESHOLD = 0.6

function normalizeUtterance(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

export function utteranceOverlap(candidate: string, reference: string): number {
  const candidateTokens = normalizeUtterance(candidate)
  const referenceTokens = new Set(normalizeUtterance(reference))
  if (candidateTokens.length === 0 || referenceTokens.size === 0) {
    return 0
  }
  let shared = 0
  for (const token of candidateTokens) {
    if (referenceTokens.has(token)) {
      shared += 1
    }
  }
  return shared / candidateTokens.length
}

export type EchoVerdict = {
  readonly discard: boolean
  readonly overlap: number
  readonly duringPlayback: boolean
  readonly matchedAgainst: string | null
}

export class EchoGuard {
  private playing = false
  private lastAgentLine: string | null = null
  private discarded = 0

  get isAgentSpeaking(): boolean {
    return this.playing
  }

  get discardedCount(): number {
    return this.discarded
  }

  get agentLine(): string | null {
    return this.lastAgentLine
  }

  replyStarted(): void {
    this.playing = true
  }

  replyDone(): void {
    this.playing = false
  }

  noteAgentTranscript(text: string): void {
    this.lastAgentLine = text
  }

  shouldSendToStt(): boolean {
    return !this.playing
  }

  inspectTurn(transcript: string): EchoVerdict {
    if (!this.playing || this.lastAgentLine === null) {
      return {
        discard: false,
        overlap: 0,
        duringPlayback: this.playing,
        matchedAgainst: null,
      }
    }
    const overlap = utteranceOverlap(transcript, this.lastAgentLine)
    const discard = overlap >= ECHO_MATCH_THRESHOLD
    if (discard) {
      this.discarded += 1
    }
    return {
      discard,
      overlap,
      duringPlayback: true,
      matchedAgainst: this.lastAgentLine,
    }
  }

  reset(): void {
    this.playing = false
    this.lastAgentLine = null
    this.discarded = 0
  }
}
