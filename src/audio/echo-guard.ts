import { isEchoOf, utteranceOverlap } from "@/confirmation"

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
    const discard = isEchoOf(transcript, this.lastAgentLine)
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
