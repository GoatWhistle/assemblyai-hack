import { describe, expect, it } from "vitest"
import { seededRandom } from "@/stats/seeded-random"
import { withNoise } from "../../scripts/build/stress-set"
import { isPartnerSubstitution, tally } from "../../scripts/measure/analyse-stress"

function row(spoken: string, heard: string, minConfidence: number) {
  return {
    spoken,
    heard,
    correct: spoken === heard,
    minConfidence,
    voice: "fixture",
    closeCode: 1000,
    socketMs: 1000,
    condition: "phone",
  }
}

describe("counting confident substitutions to a published partner", () => {
  it("counts hydromorphone heard as morphine at 0.99 as one", () => {
    const counted = tally([row("hydromorphone", "morphine", 0.99)])
    expect(counted.confidentPartnerSubstitutions.length).toBe(1)
  })

  it("does not count a partner heard below the threshold as confident, but still as a partner", () => {
    const counted = tally([row("hydromorphone", "morphine", 0.9)])
    expect(counted.partnerSubstitutions).toBe(1)
    expect(counted.confidentPartnerSubstitutions.length).toBe(0)
  })

  it("does not count an error that is not a published partner", () => {
    expect(isPartnerSubstitution(row("hydromorphone", "hydromorphine", 0.99))).toBe(false)
    expect(isPartnerSubstitution(row("hydromorphone", "hydromorphone", 1))).toBe(false)
  })
})

describe("the stress set adds noise at the stated signal-to-noise ratio", () => {
  const speech = Int16Array.from({ length: 16000 }, (_, index) =>
    Math.round(8000 * Math.sin((2 * Math.PI * 440 * index) / 16000)),
  )

  function rms(samples: ArrayLike<number>): number {
    let sum = 0
    for (let index = 0; index < samples.length; index += 1) {
      sum += (samples[index] ?? 0) ** 2
    }
    return Math.sqrt(sum / samples.length)
  }

  for (const snr of [10, 5]) {
    it(`mixes noise at ${snr} dB within half a decibel`, () => {
      const noisy = withNoise(speech, snr, seededRandom(1))
      const noise = Array.from(noisy, (value, index) => value - (speech[index] ?? 0))
      const measured = 20 * Math.log10(rms(speech) / rms(noise))
      expect(Math.abs(measured - snr)).toBeLessThan(0.5)
    })
  }
})
