export const STT_SAMPLE_RATE = 16000
export const AGENT_SAMPLE_RATE = 24000

export function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate <= 0 || toRate <= 0) {
    throw new RangeError(`sample rates must be positive, got ${fromRate} and ${toRate}`)
  }
  if (fromRate === toRate || input.length === 0) {
    return input.slice(0)
  }
  const ratio = fromRate / toRate
  const outLength = Math.max(1, Math.floor(input.length / ratio))
  const output = new Float32Array(outLength)
  for (let i = 0; i < outLength; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    const weight = position - left
    const a = input[left] ?? 0
    const b = input[right] ?? 0
    output[i] = a + (b - a) * weight
  }
  return output
}

export function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] ?? 0
    const clipped = raw < -1 ? -1 : raw > 1 ? 1 : raw
    output[i] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff
  }
  return output
}

export function pcm16ToFloat(input: Int16Array): Float32Array {
  const output = new Float32Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] ?? 0
    output[i] = raw < 0 ? raw / 0x8000 : raw / 0x7fff
  }
  return output
}

export function samplesForMs(sampleRate: number, ms: number): number {
  return Math.round((sampleRate * ms) / 1000)
}

export function msForSamples(sampleRate: number, samples: number): number {
  return (samples / sampleRate) * 1000
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const slice = bytes.subarray(offset, offset + chunk)
    binary += String.fromCharCode(...slice)
  }
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary)
  }
  return Buffer.from(bytes).toString("base64")
}

export function decodeBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array(Buffer.from(value, "base64"))
}

export function pcm16Bytes(samples: Int16Array): Uint8Array {
  return new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
}
