import { describe, expect, it } from "vitest"
import {
  assertChunkDuration,
  ChunkDurationError,
  Chunker,
  MAX_CHUNK_MS,
  MIN_CHUNK_MS,
} from "@/audio/chunker"
import { AGENT_SAMPLE_RATE, msForSamples, STT_SAMPLE_RATE } from "@/audio/resample"

describe("Chunker", () => {
  it("emits fixed 100 ms chunks at the stt rate", () => {
    const chunker = new Chunker(STT_SAMPLE_RATE, 100)
    expect(chunker.targetSamples).toBe(1600)
    const emitted = chunker.push(new Float32Array(4000))
    expect(emitted.length).toBe(2)
    for (const chunk of emitted) {
      expect(msForSamples(STT_SAMPLE_RATE, chunk.length)).toBe(100)
    }
    expect(chunker.bufferedSamples).toBe(800)
  })

  it("emits fixed 100 ms chunks at the agent rate", () => {
    const chunker = new Chunker(AGENT_SAMPLE_RATE, 100)
    expect(chunker.targetSamples).toBe(2400)
    const emitted = chunker.push(new Float32Array(2400))
    expect(emitted.length).toBe(1)
    expect(msForSamples(AGENT_SAMPLE_RATE, emitted[0]?.length ?? 0)).toBe(100)
  })

  it("never emits a chunk outside the window the socket accepts", () => {
    const chunker = new Chunker(STT_SAMPLE_RATE, 100)
    for (const chunk of chunker.push(new Float32Array(16000))) {
      const ms = msForSamples(STT_SAMPLE_RATE, chunk.length)
      expect(ms).toBeGreaterThanOrEqual(MIN_CHUNK_MS)
      expect(ms).toBeLessThanOrEqual(MAX_CHUNK_MS)
    }
  })

  it("drops a flush that would be shorter than the minimum rather than sending it", () => {
    const chunker = new Chunker(STT_SAMPLE_RATE, 100)
    chunker.push(new Float32Array(400))
    expect(chunker.flush()).toBeNull()
  })

  it("flushes a remainder that is still long enough", () => {
    const chunker = new Chunker(STT_SAMPLE_RATE, 200)
    chunker.push(new Float32Array(1600))
    const flushed = chunker.flush()
    expect(flushed).not.toBeNull()
    expect(msForSamples(STT_SAMPLE_RATE, flushed?.length ?? 0)).toBe(100)
  })

  it("refuses a configured chunk length the socket would close 3007 over", () => {
    expect(() => new Chunker(STT_SAMPLE_RATE, 20)).toThrow(ChunkDurationError)
    expect(() => new Chunker(STT_SAMPLE_RATE, 1200)).toThrow(ChunkDurationError)
  })

  it("names close code 3007 in the error so a violation explains itself", () => {
    try {
      new Chunker(STT_SAMPLE_RATE, 10)
      expect.unreachable()
    } catch (error) {
      expect((error as Error).message).toContain("3007")
    }
  })

  it("resets its buffer when half-duplex mutes the stt path", () => {
    const chunker = new Chunker(STT_SAMPLE_RATE, 100)
    chunker.push(new Float32Array(800))
    chunker.reset()
    expect(chunker.bufferedSamples).toBe(0)
  })
})

describe("assertChunkDuration", () => {
  it("accepts the boundaries and rejects just outside them", () => {
    expect(assertChunkDuration(STT_SAMPLE_RATE, 800)).toBe(50)
    expect(assertChunkDuration(STT_SAMPLE_RATE, 16000)).toBe(1000)
    expect(() => assertChunkDuration(STT_SAMPLE_RATE, 700)).toThrow(ChunkDurationError)
    expect(() => assertChunkDuration(STT_SAMPLE_RATE, 16400)).toThrow(ChunkDurationError)
  })
})
