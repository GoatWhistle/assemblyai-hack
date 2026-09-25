#!/usr/bin/env -S npx tsx

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { lasaRiskFor } from "@/lasa"
import { seededRandom } from "@/stats/seeded-random"

const STRESS_SOURCES: readonly string[] = ["eval/dev", "eval/control"]
const OUT_DIR = "eval/stress"
const RATE = 16000
const SEED = 20260925

export type Condition = {
  readonly id: string
  readonly snrDb: number | null
  readonly tempo: number
}

const CONDITIONS: readonly Condition[] = [
  { id: "phone", snrDb: null, tempo: 1 },
  { id: "phone-snr10", snrDb: 10, tempo: 1 },
  { id: "phone-snr5", snrDb: 5, tempo: 1 },
  { id: "phone-fast", snrDb: null, tempo: 1.1 },
]

type SourceItem = {
  readonly file: string
  readonly spoken: string
  readonly carrier: string
  readonly voice: string
  readonly entityType: string
}

function readManifest(set: string): readonly SourceItem[] {
  const raw = readFileSync(join(set, "manifest.json"), "utf8")
  const parsed = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as {
    items: readonly SourceItem[]
  }
  return parsed.items
}

function ffmpeg(args: readonly string[], input?: Buffer): Buffer {
  return execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
    input,
    maxBuffer: 64 * 1024 * 1024,
  })
}

function decode(file: string, tempo: number): Int16Array {
  const filters = tempo === 1 ? [] : ["-af", `atempo=${tempo}`]
  const raw = ffmpeg([
    "-i",
    file,
    ...filters,
    "-ac",
    "1",
    "-ar",
    String(RATE),
    "-f",
    "s16le",
    "-",
  ])
  return new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2))
}

function activeRms(samples: Int16Array): number {
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 1)
  const floor = peak / 100
  let sum = 0
  let count = 0
  for (const value of samples) {
    if (Math.abs(value) >= floor) {
      sum += value * value
      count += 1
    }
  }
  return count === 0 ? 0 : Math.sqrt(sum / count)
}

export function withNoise(
  samples: Int16Array,
  snrDb: number,
  random: () => number,
): Int16Array {
  const noiseRms = activeRms(samples) / 10 ** (snrDb / 20)
  const out = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const u = Math.max(random(), 1e-12)
    const v = random()
    const gaussian = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    const mixed = (samples[index] ?? 0) + gaussian * noiseRms
    out[index] = Math.max(-32768, Math.min(32767, Math.round(mixed)))
  }
  return out
}

function telephone(samples: Int16Array, target: string): void {
  const input = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)
  const mulaw = ffmpeg(
    [
      "-f",
      "s16le",
      "-ar",
      String(RATE),
      "-ac",
      "1",
      "-i",
      "-",
      "-af",
      "highpass=f=300,lowpass=f=3400",
      "-ar",
      "8000",
      "-c:a",
      "pcm_mulaw",
      "-f",
      "wav",
      "-",
    ],
    input,
  )
  ffmpeg(
    ["-y", "-f", "wav", "-i", "-", "-ar", String(RATE), "-c:a", "pcm_s16le", target],
    mulaw,
  )
}

function main(): void {
  const random = seededRandom(SEED)
  const items: Record<string, unknown>[] = []
  for (const set of STRESS_SOURCES) {
    const eligible = readManifest(set).filter((item) => lasaRiskFor(item.spoken).hit)
    for (const condition of CONDITIONS) {
      const dir = join(OUT_DIR, "audio", condition.id)
      mkdirSync(dir, { recursive: true })
      for (const item of eligible) {
        const name = `${set.split("/").pop()}-${item.file.split("/").pop()}`
        const target = join(dir, name)
        const clean = decode(item.file, condition.tempo)
        const noisy =
          condition.snrDb === null ? clean : withNoise(clean, condition.snrDb, random)
        telephone(noisy, target)
        items.push({
          file: target.replace(/\\/g, "/"),
          spoken: item.spoken,
          carrier: item.carrier,
          voice: item.voice,
          entityType: item.entityType,
          condition: condition.id,
          source: item.file,
          sha256: createHash("sha256").update(readFileSync(target)).digest("hex"),
        })
      }
    }
  }
  const manifest = {
    builtAt: new Date().toISOString(),
    method: `every recording of ${STRESS_SOURCES.join(" and ")} whose spoken name is on the full 2023 ISMP list, degraded four ways: the telephone band alone (300 to 3400 Hz, 8 kHz mu-law, back to 16 kHz PCM for the socket), the same with Gaussian noise at 10 dB and at 5 dB SNR against the active speech level, and the same sped up by 1.1 with ffmpeg atempo; noise seed ${SEED}`,
    caveat:
      "desktop TTS voices, not human speech; the noise is white, not a room; eval/native16 is left out because it repeats the 40 control terms and voices with only the resampler changed",
    conditions: CONDITIONS,
    count: items.length,
    items,
  }
  mkdirSync(resolve(OUT_DIR), { recursive: true })
  writeFileSync(
    join(OUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  )
  console.log(
    `stress items written: ${items.length} (${items.length / CONDITIONS.length} recordings x ${CONDITIONS.length} conditions)`,
  )
}

if (process.argv[1]?.includes("stress-set")) {
  main()
}
