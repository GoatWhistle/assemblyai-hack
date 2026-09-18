import { describe, expect, it } from "vitest"
import { createPlayback } from "@/audio/playback"

type FakeSource = {
  buffer: unknown
  connected: unknown
  started: number[]
  stopped: boolean
  onended: (() => void) | null
  connect: (destination: unknown) => void
  start: (when: number) => void
  stop: () => void
}

function fakeAudioContext() {
  const sources: FakeSource[] = []
  let closed = false
  const context = {
    currentTime: 0,
    destination: { tag: "destination" },
    createBuffer: (_channels: number, length: number, _sampleRate: number) => {
      const data = new Float32Array(length)
      return {
        getChannelData: () => data,
      }
    },
    createBufferSource: (): FakeSource => {
      const source: FakeSource = {
        buffer: null,
        connected: null,
        started: [],
        stopped: false,
        onended: null,
        connect: (destination: unknown) => {
          source.connected = destination
        },
        start: (when: number) => {
          source.started.push(when)
        },
        stop: () => {
          source.stopped = true
        },
      }
      sources.push(source)
      return source
    },
    close: async () => {
      closed = true
    },
  }
  return { context, sources, isClosed: () => closed }
}

function silentFrameBase64(sampleCount: number): string {
  const bytes = new Uint8Array(sampleCount * 2)
  return Buffer.from(bytes).toString("base64")
}

describe("createPlayback turns agent audio frames into scheduled sources on the real destination", () => {
  it("connects every scheduled source to the context destination, which is the only audible output path", () => {
    const { context, sources } = fakeAudioContext()
    const playback = createPlayback(context as unknown as AudioContext)

    playback.enqueue(silentFrameBase64(480))

    expect(sources, "one audio frame must schedule exactly one buffer source").toHaveLength(1)
    expect(
      sources[0]?.connected,
      "the scheduled source must connect to context.destination, or nothing plays",
    ).toBe(context.destination)
    expect(sources[0]?.started, "a scheduled source must actually be started").toHaveLength(1)
  })

  it("drops a frame too short to contain even one sample", () => {
    const { sources } = fakeAudioContext()
    const { context } = fakeAudioContext()
    const playback = createPlayback(context as unknown as AudioContext)

    playback.enqueue(Buffer.from(new Uint8Array([1])).toString("base64"))

    expect(
      sources,
      "a one-byte frame carries no complete sample and must not schedule a node",
    ).toHaveLength(0)
  })

  it("tracks how many sources are still scheduled", () => {
    const { context } = fakeAudioContext()
    const playback = createPlayback(context as unknown as AudioContext)

    playback.enqueue(silentFrameBase64(480))
    playback.enqueue(silentFrameBase64(480))

    expect(
      playback.scheduledCount,
      "two enqueued frames must both be tracked as scheduled",
    ).toBe(2)
  })

  it("flush stops every scheduled source and clears the queue", () => {
    const { context, sources } = fakeAudioContext()
    const playback = createPlayback(context as unknown as AudioContext)

    playback.enqueue(silentFrameBase64(480))
    playback.enqueue(silentFrameBase64(480))
    playback.flush()

    expect(
      sources.every((source) => source.stopped),
      "a barge-in must stop every source already scheduled, not just the newest one",
    ).toBe(true)
    expect(playback.scheduledCount, "flush must clear the scheduled queue").toBe(0)
  })

  it("close stops every scheduled source and closes the underlying context", async () => {
    const { context, sources, isClosed } = fakeAudioContext()
    const playback = createPlayback(context as unknown as AudioContext)

    playback.enqueue(silentFrameBase64(480))
    await playback.close()

    expect(sources[0]?.stopped, "close must stop a source still in flight").toBe(true)
    expect(isClosed(), "close must release the underlying AudioContext").toBe(true)
  })
})
