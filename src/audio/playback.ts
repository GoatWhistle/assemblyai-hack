import { createReplyClock, type ReplyMeasure } from "./reply-clock"
import { AGENT_SAMPLE_RATE, decodeBase64, pcm16ToFloat } from "./resample"

const SETTLE_POLL_MS = 100
const SETTLE_GRACE_MS = 2000
const JITTER_LEAD_S = 0.15

export type PlaybackHandle = {
  enqueue: (base64: string) => void
  flush: () => void
  close: () => Promise<void>
  beginReply: () => void
  settleReply: () => Promise<ReplyMeasure>
  readonly scheduledCount: number
}

export function createPlayback(context: AudioContext): PlaybackHandle {
  let scheduled: AudioBufferSourceNode[] = []
  let cursor = 0
  const clock = createReplyClock()
  let settlers: (() => void)[] = []

  const releaseSettlers = () => {
    const pending = settlers
    settlers = []
    for (const settle of pending) {
      settle()
    }
  }

  const settleReply = (): Promise<ReplyMeasure> =>
    new Promise<ReplyMeasure>((resolve) => {
      let done = false
      const remainingMs = Math.max(0, (clock.finishesAt() - context.currentTime) * 1000)
      const giveUpAt = Date.now() + remainingMs + SETTLE_GRACE_MS
      const finish = () => {
        if (done) {
          return
        }
        done = true
        resolve(clock.measure(context.currentTime))
      }
      const check = () => {
        if (done) {
          return
        }
        if (
          clock.stopped ||
          context.currentTime >= clock.finishesAt() ||
          Date.now() >= giveUpAt
        ) {
          finish()
          return
        }
        setTimeout(check, SETTLE_POLL_MS)
      }
      settlers.push(finish)
      check()
    })

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
      const seconds = floats.length / AGENT_SAMPLE_RATE
      buffer.getChannelData(0).set(floats)
      const node = context.createBufferSource()
      node.buffer = buffer
      node.connect(context.destination)
      const startAt =
        cursor > context.currentTime ? cursor : context.currentTime + JITTER_LEAD_S
      node.onended = () => drop(node)
      node.start(startAt)
      cursor = startAt + seconds
      clock.schedule(startAt, seconds)
      scheduled.push(node)
    },
    beginReply: () => clock.begin(),
    settleReply,
    flush: () => {
      clock.stopAt(context.currentTime)
      releaseSettlers()
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
      clock.stopAt(context.currentTime)
      releaseSettlers()
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
