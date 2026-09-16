import { msForSamples, samplesForMs } from "./resample"

export const MIN_CHUNK_MS = 50
export const MAX_CHUNK_MS = 1000

export class ChunkDurationError extends Error {
  readonly code = "CHUNK_DURATION_OUT_OF_RANGE"

  constructor(ms: number) {
    super(
      `a chunk of ${ms.toFixed(1)} ms is outside the accepted ${MIN_CHUNK_MS}-${MAX_CHUNK_MS} ms window; the socket would close with 3007`,
    )
    this.name = "ChunkDurationError"
  }
}

export function assertChunkDuration(sampleRate: number, samples: number): number {
  const ms = msForSamples(sampleRate, samples)
  if (ms < MIN_CHUNK_MS || ms > MAX_CHUNK_MS) {
    throw new ChunkDurationError(ms)
  }
  return ms
}

export class Chunker {
  private readonly target: number
  private pending: Float32Array
  private filled = 0

  constructor(
    readonly sampleRate: number,
    readonly chunkMs: number,
  ) {
    if (chunkMs < MIN_CHUNK_MS || chunkMs > MAX_CHUNK_MS) {
      throw new ChunkDurationError(chunkMs)
    }
    this.target = samplesForMs(sampleRate, chunkMs)
    this.pending = new Float32Array(this.target)
  }

  get targetSamples(): number {
    return this.target
  }

  get bufferedSamples(): number {
    return this.filled
  }

  push(input: Float32Array): Float32Array[] {
    const out: Float32Array[] = []
    let read = 0
    while (read < input.length) {
      const room = this.target - this.filled
      const take = Math.min(room, input.length - read)
      this.pending.set(input.subarray(read, read + take), this.filled)
      this.filled += take
      read += take
      if (this.filled === this.target) {
        out.push(this.pending.slice(0))
        this.filled = 0
      }
    }
    return out
  }

  flush(): Float32Array | null {
    if (this.filled === 0) {
      return null
    }
    const ms = msForSamples(this.sampleRate, this.filled)
    if (ms < MIN_CHUNK_MS) {
      this.filled = 0
      return null
    }
    const out = this.pending.slice(0, this.filled)
    this.filled = 0
    return out
  }

  reset(): void {
    this.filled = 0
  }
}
