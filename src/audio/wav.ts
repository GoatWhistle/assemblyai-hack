import { encodeBase64 } from "./resample"

const HEADER_BYTES = 44

export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return joined
}

export function pcm16Wav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES + pcm.byteLength)
  const view = new DataView(out.buffer)
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }
  ascii(0, "RIFF")
  view.setUint32(4, 36 + pcm.byteLength, true)
  ascii(8, "WAVE")
  ascii(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, "data")
  view.setUint32(40, pcm.byteLength, true)
  out.set(pcm, HEADER_BYTES)
  return out
}

export function wavDataUri(pcm: Uint8Array, sampleRate: number): string | null {
  if (pcm.byteLength === 0) {
    return null
  }
  return `data:audio/wav;base64,${encodeBase64(pcm16Wav(pcm, sampleRate))}`
}

export function pcmSlice(
  pcm: Uint8Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
): Uint8Array {
  const bytesPerMs = (sampleRate * 2) / 1000
  const start = Math.max(0, Math.floor((startMs * bytesPerMs) / 2) * 2)
  const end = Math.min(pcm.byteLength, Math.ceil((endMs * bytesPerMs) / 2) * 2)
  return end <= start ? new Uint8Array(0) : pcm.slice(start, end)
}
