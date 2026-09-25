import { createPlayback, type PlaybackHandle } from "@/audio/playback"
import type { ReplyMeasure } from "@/audio/reply-clock"

const SILENT_REPLY: ReplyMeasure = Object.freeze({ playedMs: 0, durationMs: 0 })

export type AgentAudioSink = {
  enqueue: (base64: string) => void
  interrupt: () => void
  beginReply: () => void
  settleReply: () => Promise<ReplyMeasure>
  close: () => Promise<void>
}

export function createAgentAudioSink(): AgentAudioSink {
  let handle: PlaybackHandle | null = null

  const ensure = (): PlaybackHandle => {
    if (handle === null) {
      handle = createPlayback(new AudioContext())
    }
    return handle
  }

  return {
    enqueue: (base64: string) => ensure().enqueue(base64),
    interrupt: () => handle?.flush(),
    beginReply: () => handle?.beginReply(),
    settleReply: () => handle?.settleReply() ?? Promise.resolve(SILENT_REPLY),
    close: async () => {
      const current = handle
      handle = null
      await current?.close()
    },
  }
}
