import { AGENT_SAMPLE_RATE, pcm16ToFloat, STT_SAMPLE_RATE } from "@/audio/resample"
import type { AudioMark, LiveRecording } from "@/domain"

const WAV_HEADER_BYTES = 44

export type RecordedPlayback = {
  clockMs: () => number
  stop: () => Promise<void>
}

export function pcmOfDataUri(uri: string | null): Uint8Array {
  if (uri === null) {
    return new Uint8Array(0)
  }
  const comma = uri.indexOf(",")
  const binary = globalThis.atob(uri.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.slice(WAV_HEADER_BYTES)
}

export type ScheduledChunk = { readonly atMs: number; readonly bytes: Uint8Array }

export function chunksOf(
  pcm: Uint8Array,
  marks: readonly AudioMark[],
): readonly ScheduledChunk[] {
  return marks.map((mark, index) => {
    const end = marks[index + 1]?.byteOffset ?? pcm.byteLength
    return {
      atMs: mark.atMs,
      bytes: pcm.slice(mark.byteOffset, end - ((end - mark.byteOffset) % 2)),
    }
  })
}

function schedule(
  context: AudioContext,
  chunks: readonly ScheduledChunk[],
  sampleRate: number,
  startAt: number,
): AudioBufferSourceNode[] {
  const nodes: AudioBufferSourceNode[] = []
  for (const chunk of chunks) {
    if (chunk.bytes.byteLength < 2) {
      continue
    }
    const samples = pcm16ToFloat(
      new Int16Array(chunk.bytes.buffer, chunk.bytes.byteOffset, chunk.bytes.byteLength / 2),
    )
    const buffer = context.createBuffer(1, samples.length, sampleRate)
    buffer.getChannelData(0).set(samples)
    const node = context.createBufferSource()
    node.buffer = buffer
    node.connect(context.destination)
    node.start(startAt + chunk.atMs / 1000)
    nodes.push(node)
  }
  return nodes
}

export function playRecording(recording: LiveRecording): RecordedPlayback {
  const context = new AudioContext()
  const startAt = context.currentTime + 0.1
  const nodes = [
    ...schedule(
      context,
      chunksOf(pcmOfDataUri(recording.audio.caller), recording.audio.callerMarks),
      STT_SAMPLE_RATE,
      startAt,
    ),
    ...schedule(
      context,
      chunksOf(pcmOfDataUri(recording.audio.agent), recording.audio.agentMarks),
      AGENT_SAMPLE_RATE,
      startAt,
    ),
  ]
  return {
    clockMs: () => Math.max(0, (context.currentTime - startAt) * 1000),
    stop: async () => {
      for (const node of nodes) {
        node.stop()
      }
      await context.close()
    },
  }
}
