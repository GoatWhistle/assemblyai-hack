import type { ReplayLine } from "./replay-script"

export type Speaker = (text: string, who: ReplayLine["who"]) => boolean

export type SpeechTrack = {
  readonly available: boolean
  tick: (clockMs: number) => void
  reset: () => void
  stop: () => void
}

export function browserSpeaker(): Speaker | null {
  const synth = globalThis.speechSynthesis
  const Utterance = globalThis.SpeechSynthesisUtterance
  if (synth === undefined || Utterance === undefined) {
    return null
  }
  return (text, who) => {
    const utterance = new Utterance(text)
    utterance.rate = who === "agent" ? 1.05 : 1
    utterance.pitch = who === "agent" ? 1.1 : 0.9
    synth.speak(utterance)
    return true
  }
}

export function createSpeechTrack(
  lines: readonly ReplayLine[],
  speaker: Speaker | null,
  cancel: () => void = () => globalThis.speechSynthesis?.cancel(),
): SpeechTrack {
  const spoken = new Set<string>()
  return {
    available: speaker !== null,
    tick: (clockMs) => {
      if (speaker === null) {
        return
      }
      for (const line of lines) {
        if (clockMs >= line.atMs && !spoken.has(line.id)) {
          spoken.add(line.id)
          speaker(line.text, line.who)
        }
      }
    },
    reset: () => {
      spoken.clear()
      cancel()
    },
    stop: () => cancel(),
  }
}
