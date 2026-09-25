import { pcm16ToFloat } from "./resample"
import { pcmSlice } from "./wav"

const SegmentSource = {
  Recorded: "recorded",
  Synthesised: "synthesised",
  Unavailable: "unavailable",
} as const

export type SegmentSource = (typeof SegmentSource)[keyof typeof SegmentSource]

export type SegmentRequest = {
  readonly startMs: number
  readonly endMs: number
  readonly text: string
}

async function playPcmSegment(
  pcm: Uint8Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
): Promise<boolean> {
  const slice = pcmSlice(pcm, sampleRate, startMs, endMs)
  const Context = globalThis.AudioContext
  if (slice.byteLength === 0 || Context === undefined) {
    return false
  }
  const context = new Context()
  const samples = pcm16ToFloat(
    new Int16Array(slice.buffer, slice.byteOffset, slice.byteLength / 2),
  )
  const buffer = context.createBuffer(1, samples.length, sampleRate)
  buffer.getChannelData(0).set(samples)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  await new Promise<void>((resolve) => {
    source.onended = () => resolve()
    source.start()
  })
  await context.close()
  return true
}

function speakText(text: string): boolean {
  const synth = globalThis.speechSynthesis
  const Utterance = globalThis.SpeechSynthesisUtterance
  if (synth === undefined || Utterance === undefined || text.trim().length === 0) {
    return false
  }
  synth.cancel()
  synth.speak(new Utterance(text))
  return true
}

export async function playSegment(
  request: SegmentRequest,
  recorded: { readonly pcm: Uint8Array; readonly sampleRate: number } | null,
): Promise<SegmentSource> {
  if (recorded !== null) {
    const played = await playPcmSegment(
      recorded.pcm,
      recorded.sampleRate,
      request.startMs,
      request.endMs,
    )
    if (played) {
      return SegmentSource.Recorded
    }
  }
  return speakText(request.text) ? SegmentSource.Synthesised : SegmentSource.Unavailable
}
