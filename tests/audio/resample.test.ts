import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  AGENT_SAMPLE_RATE,
  decodeBase64,
  encodeBase64,
  floatToPcm16,
  msForSamples,
  pcm16Bytes,
  pcm16ToFloat,
  resampleLinear,
  STT_SAMPLE_RATE,
  samplesForMs,
} from "@/audio/resample"

function ramp(length: number): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.sin((i / length) * Math.PI * 2)
  }
  return out
}

describe("resampleLinear", () => {
  it("produces the 16 kHz sample count the stt socket expects from a 48 kHz frame", () => {
    const input = ramp(4800)
    const output = resampleLinear(input, 48000, STT_SAMPLE_RATE)
    expect(output.length).toBe(1600)
    expect(msForSamples(STT_SAMPLE_RATE, output.length)).toBeCloseTo(100, 5)
  })

  it("produces the 24 kHz sample count the agent socket expects from a 48 kHz frame", () => {
    const output = resampleLinear(ramp(4800), 48000, AGENT_SAMPLE_RATE)
    expect(output.length).toBe(2400)
    expect(msForSamples(AGENT_SAMPLE_RATE, output.length)).toBeCloseTo(100, 5)
  })

  it("returns a copy rather than the same buffer when the rates already match", () => {
    const input = ramp(64)
    const output = resampleLinear(input, 16000, 16000)
    expect(output).not.toBe(input)
    expect(Array.from(output)).toEqual(Array.from(input))
  })

  it("upsamples as well as downsamples", () => {
    expect(resampleLinear(ramp(800), 8000, 16000).length).toBe(1600)
  })

  it("rejects a non-positive rate", () => {
    expect(() => resampleLinear(ramp(8), 0, 16000)).toThrow(RangeError)
  })
})

describe("floatToPcm16", () => {
  it("clips beyond the unit interval before scaling, so loud peaks do not wrap", () => {
    const output = floatToPcm16(new Float32Array([2, -2]))
    expect(output[0]).toBe(0x7fff)
    expect(output[1]).toBe(-0x8000)
  })

  it("uses the asymmetric multipliers for the two signs", () => {
    const output = floatToPcm16(new Float32Array([1, -1, 0]))
    expect(output[0]).toBe(32767)
    expect(output[1]).toBe(-32768)
    expect(output[2]).toBe(0)
  })

  it("round-trips through pcm16ToFloat within quantisation error", () => {
    const input = new Float32Array([0.5, -0.5, 0.25])
    const output = pcm16ToFloat(floatToPcm16(input))
    for (let i = 0; i < input.length; i += 1) {
      expect(output[i]).toBeCloseTo(input[i] ?? 0, 4)
    }
  })

  it("yields two bytes per sample for the binary stt frame", () => {
    expect(pcm16Bytes(floatToPcm16(ramp(1600))).byteLength).toBe(3200)
  })
})

describe("samplesForMs", () => {
  it("maps the chunk window to the sample counts each socket needs", () => {
    expect(samplesForMs(STT_SAMPLE_RATE, 100)).toBe(1600)
    expect(samplesForMs(AGENT_SAMPLE_RATE, 100)).toBe(2400)
    expect(samplesForMs(STT_SAMPLE_RATE, 50)).toBe(800)
  })
})

describe("base64", () => {
  it("round-trips the bytes the agent socket carries inside input.audio", () => {
    const bytes = pcm16Bytes(floatToPcm16(ramp(2400)))
    const restored = decodeBase64(encodeBase64(bytes))
    expect(restored.byteLength).toBe(bytes.byteLength)
    expect(Array.from(restored.subarray(0, 16))).toEqual(Array.from(bytes.subarray(0, 16)))
  })

  it("never references the Node Buffer global, which webpack would polyfill into every client bundle", () => {
    const source = readFileSync("src/audio/resample.ts", "utf8")
    expect(
      source,
      "this file ships to the browser; btoa/atob cover every runtime it actually runs in, so a Buffer fallback only adds a ~22 kB polyfill chunk that never executes",
    ).not.toMatch(/\bBuffer\b/)
  })
})
