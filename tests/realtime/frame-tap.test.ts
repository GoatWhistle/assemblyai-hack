import { describe, expect, it } from "vitest"
import { CLOSE_FRAME_TYPE, type TappedFrame, tapTransport } from "@/realtime/frame-tap"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

function rig() {
  const frames: TappedFrame[] = []
  const opened: MemoryTransport[] = []
  const base: TransportFactory = (_url, listeners) => {
    const transport = new MemoryTransport(listeners)
    opened.push(transport)
    return transport
  }
  const received: unknown[] = []
  const factory = tapTransport(
    base,
    (frame) => frames.push(frame),
    () => 42,
  )
  return { frames, opened, received, factory }
}

describe("the frame tap records protocol frames on both sockets and never audio", () => {
  it("names the socket from its host and records both directions", () => {
    const { frames, opened, factory } = rig()
    const agent = factory("wss://agents.assemblyai.com/v1/ws?token=t", {
      onOpen: () => undefined,
      onMessage: () => undefined,
      onClose: () => undefined,
      onError: () => undefined,
    })
    agent.send(JSON.stringify({ type: "session.update", session: {} }))
    opened[0]?.deliverJson({ type: "reply.started", reply_id: "r" })
    expect(
      frames.map((frame) => [frame.socket, frame.direction, frame.type, frame.atMs]),
    ).toEqual([
      ["agent", "out", "session.update", 42],
      ["agent", "in", "reply.started", 42],
    ])
  })

  it("drops audio in either direction, binary or base64", () => {
    const { frames, opened, factory } = rig()
    const stt = factory("wss://streaming.assemblyai.com/v3/ws?token=t", {
      onOpen: () => undefined,
      onMessage: () => undefined,
      onClose: () => undefined,
      onError: () => undefined,
    })
    stt.send(new Uint8Array([1, 2, 3]))
    const agent = factory("wss://agents.assemblyai.com/v1/ws?token=t", {
      onOpen: () => undefined,
      onMessage: () => undefined,
      onClose: () => undefined,
      onError: () => undefined,
    })
    agent.send(JSON.stringify({ type: "input.audio", audio: "AAAA" }))
    opened[1]?.deliverJson({ type: "reply.audio", data: "AAAA" })
    opened[1]?.deliverJson({ type: "audio", audio: "AAAA" })
    expect(frames).toEqual([])
  })

  it("still delivers every message to the client it wraps", () => {
    const { opened, factory } = rig()
    const seen: unknown[] = []
    factory("wss://streaming.assemblyai.com/v3/ws?token=t", {
      onOpen: () => undefined,
      onMessage: (data) => seen.push(data),
      onClose: () => undefined,
      onError: () => undefined,
    })
    opened[0]?.deliver(new ArrayBuffer(2))
    opened[0]?.deliverJson({ type: "Begin" })
    expect(seen).toHaveLength(2)
  })

  it("records a close with its code, because a drop is part of the protocol story", () => {
    const { frames, opened, factory } = rig()
    factory("wss://streaming.assemblyai.com/v3/ws?token=t", {
      onOpen: () => undefined,
      onMessage: () => undefined,
      onClose: () => undefined,
      onError: () => undefined,
    })
    opened[0]?.close(1006, "gone")
    expect(frames[0]).toMatchObject({
      socket: "stt",
      type: CLOSE_FRAME_TYPE,
      frame: { code: 1006, reason: "gone" },
    })
  })
})
