import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

type Posted = { type: string; frame: Float32Array; muted: boolean; peak: number }

type Processor = {
  process: (inputs: Float32Array[][]) => boolean
  port: { onmessage: ((event: { data: unknown }) => void) | null; posted: Posted[] }
}

function loadProcessor(frameSize: number): Processor {
  const source = readFileSync(
    join(process.cwd(), "public", "worklets", "capture-processor.js"),
    "utf8",
  )
  let registered: (new (options: unknown) => Processor) | null = null
  class FakeProcessor {
    port = {
      onmessage: null as ((event: { data: unknown }) => void) | null,
      posted: [] as Posted[],
      postMessage(message: Posted) {
        this.posted.push(message)
      },
    }
  }
  const run = new Function("AudioWorkletProcessor", "registerProcessor", source)
  run(FakeProcessor, (_name: string, ctor: new (options: unknown) => Processor) => {
    registered = ctor
  })
  if (registered === null) {
    throw new Error("the worklet registered no processor")
  }
  const Ctor: new (options: unknown) => Processor = registered
  return new Ctor({ processorOptions: { frameSize } })
}

describe("the capture worklet keeps time flowing when the input carries no channel", () => {
  it("posts silent frames for a render quantum with no input channel, so the recognizer can hear the pause and end the turn", () => {
    const processor = loadProcessor(256)
    for (let i = 0; i < 4; i += 1) {
      expect(processor.process([[]])).toBe(true)
    }
    const frames = processor.port.posted.filter((message) => message.type === "frame")
    expect(frames).toHaveLength(2)
    for (const frame of frames) {
      expect(frame.frame).toHaveLength(256)
      expect(frame.peak).toBe(0)
      expect(Array.from(frame.frame).every((sample) => sample === 0)).toBe(true)
    }
  })

  it("posts silent frames when the input list itself is empty", () => {
    const processor = loadProcessor(128)
    processor.process([])
    expect(processor.port.posted).toHaveLength(1)
  })

  it("still carries real samples and their peak when a channel is present", () => {
    const processor = loadProcessor(128)
    const channel = new Float32Array(128).fill(0.25)
    channel[5] = -0.5
    processor.process([[channel]])
    const [frame] = processor.port.posted
    expect(frame?.peak).toBe(0.5)
    expect(frame?.frame[0]).toBe(0.25)
  })
})
