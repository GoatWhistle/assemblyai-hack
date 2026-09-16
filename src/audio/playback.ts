import { AGENT_SAMPLE_RATE, decodeBase64, pcm16ToFloat } from "./resample"

export type PlaybackHandle = {
  enqueue: (base64: string) => void
  flush: () => void
  close: () => Promise<void>
  readonly scheduledCount: number
}

export function createPlayback(context: AudioContext): PlaybackHandle {
  let scheduled: AudioBufferSourceNode[] = []
  let cursor = 0

  const drop = (node: AudioBufferSourceNode) => {
    scheduled = scheduled.filter((existing) => existing !== node)
  }

  return {
    get scheduledCount() {
      return scheduled.length
    },
    enqueue: (base64: string) => {
      const bytes = decodeBase64(base64)
      if (bytes.length < 2) {
        return
      }
      const usable = bytes.length - (bytes.length % 2)
      const samples = new Int16Array(usable / 2)
      for (let i = 0; i < samples.length; i += 1) {
        const low = bytes[i * 2] ?? 0
        const high = bytes[i * 2 + 1] ?? 0
        const value = low | (high << 8)
        samples[i] = value > 0x7fff ? value - 0x10000 : value
      }
      const floats = pcm16ToFloat(samples)
      const buffer = context.createBuffer(1, floats.length, AGENT_SAMPLE_RATE)
      buffer.getChannelData(0).set(floats)
      const node = context.createBufferSource()
      node.buffer = buffer
      node.connect(context.destination)
      const startAt = Math.max(cursor, context.currentTime)
      node.onended = () => drop(node)
      node.start(startAt)
      cursor = startAt + buffer.duration
      scheduled.push(node)
    },
    flush: () => {
      for (const node of scheduled) {
        try {
          node.stop()
        } catch {
          void 0
        }
      }
      scheduled = []
      cursor = context.currentTime
    },
    close: async () => {
      for (const node of scheduled) {
        try {
          node.stop()
        } catch {
          void 0
        }
      }
      scheduled = []
      await context.close()
    },
  }
}
