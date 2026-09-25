import type { TappedFrame } from "@/realtime/frame-tap"

const FRAME_LOG_LIMIT = 120

export type FrameLog = {
  push: (frame: TappedFrame) => void
  clear: () => void
  subscribe: (listener: () => void) => () => void
  snapshot: () => readonly TappedFrame[]
  total: () => number
}

export function createFrameLog(limit = FRAME_LOG_LIMIT): FrameLog {
  let frames: readonly TappedFrame[] = []
  let count = 0
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    push: (frame) => {
      count += 1
      const next = [...frames, frame]
      frames = next.length > limit ? next.slice(next.length - limit) : next
      notify()
    },
    clear: () => {
      frames = []
      count = 0
      notify()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    snapshot: () => frames,
    total: () => count,
  }
}
