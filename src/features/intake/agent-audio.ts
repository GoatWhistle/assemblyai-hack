import { createPlayback, type PlaybackHandle } from "@/audio/playback"

export type AgentAudioSink = {
  enqueue: (base64: string) => void
  interrupt: () => void
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
    close: async () => {
      const current = handle
      handle = null
      await current?.close()
    },
  }
}
