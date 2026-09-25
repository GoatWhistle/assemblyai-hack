import { readFileSync } from "node:fs"

export function readWav(path: string): { readonly rate: number; readonly samples: Int16Array } {
  const buffer = readFileSync(path)
  let offset = 12
  let rate = 0
  let dataStart = -1
  let dataLength = 0

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    if (id === "fmt ") {
      rate = buffer.readUInt32LE(offset + 12)
    }
    if (id === "data") {
      dataStart = offset + 8
      dataLength = size
      break
    }
    offset += 8 + size + (size % 2)
  }

  if (dataStart < 0 || rate === 0) {
    throw new Error(`${path}: no data or fmt chunk found`)
  }

  const count = Math.floor(dataLength / 2)
  const samples = new Int16Array(count)
  for (let i = 0; i < count; i += 1) {
    samples[i] = buffer.readInt16LE(dataStart + i * 2)
  }
  return { rate, samples }
}

export function resampleLinear(
  samples: Int16Array,
  fromRate: number,
  toRate: number,
): Int16Array {
  if (fromRate === toRate) {
    return samples
  }
  const ratio = fromRate / toRate
  const outLength = Math.floor(samples.length / ratio)
  const out = new Int16Array(outLength)
  for (let i = 0; i < outLength; i += 1) {
    const source = i * ratio
    const low = Math.floor(source)
    const high = Math.min(samples.length - 1, low + 1)
    const weight = source - low
    const value = (samples[low] ?? 0) * (1 - weight) + (samples[high] ?? 0) * weight
    out[i] = Math.max(-32768, Math.min(32767, Math.round(value)))
  }
  return out
}
