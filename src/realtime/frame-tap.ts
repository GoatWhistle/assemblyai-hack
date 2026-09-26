import { AGENT_HOST } from "@/domain"
import type { TransportFactory } from "./transport"

export type TappedSocket = "stt" | "agent"

export type FrameDirection = "in" | "out"

export type TappedFrame = {
  readonly socket: TappedSocket
  readonly direction: FrameDirection
  readonly atMs: number
  readonly type: string
  readonly frame: unknown
}

export type FrameSink = (frame: TappedFrame) => void

export const CLOSE_FRAME_TYPE = "socket.close"

const AUDIO_TYPES: readonly string[] = ["input.audio", "audio"]

function isAudioFrameType(type: string): boolean {
  return AUDIO_TYPES.includes(type) || type.startsWith("reply.audio")
}

function socketOfUrl(url: string): TappedSocket {
  return url.includes(AGENT_HOST) ? "agent" : "stt"
}

function readFrame(data: unknown): { type: string; frame: unknown } | null {
  if (typeof data !== "string") {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return { type: "unparsed", frame: data.slice(0, 200) }
  }
  const type =
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as { type?: unknown }).type === "string"
      ? (parsed as { type: string }).type
      : "untyped"
  if (isAudioFrameType(type)) {
    return null
  }
  return { type, frame: parsed }
}

export function tapTransport(
  factory: TransportFactory,
  sink: FrameSink,
  now: () => number = () => Date.now(),
): TransportFactory {
  return (url, listeners) => {
    const socket = socketOfUrl(url)
    const record = (direction: FrameDirection, data: unknown) => {
      const read = readFrame(data)
      if (read !== null) {
        sink({ socket, direction, atMs: now(), type: read.type, frame: read.frame })
      }
    }
    const inner = factory(url, {
      ...listeners,
      onMessage: (data) => {
        record("in", data)
        listeners.onMessage(data)
      },
      onClose: (code, reason) => {
        sink({
          socket,
          direction: "in",
          atMs: now(),
          type: CLOSE_FRAME_TYPE,
          frame: { code, reason },
        })
        listeners.onClose(code, reason)
      },
    })
    return {
      get isOpen() {
        return inner.isOpen
      },
      send: (data) => {
        record("out", data)
        inner.send(data)
      },
      close: (code, reason) => inner.close(code, reason),
    }
  }
}
