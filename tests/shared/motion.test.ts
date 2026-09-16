import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const MOTION = readFileSync("src/styles/tokens/motion.css", "utf8")

async function stylesheets(): Promise<string[]> {
  const files: string[] = []
  for await (const file of glob("src/**/*.css")) {
    files.push(file)
  }
  return files
}

describe("motion tokens", () => {
  it("collapses every duration under prefers-reduced-motion", async () => {
    const reduced = MOTION.slice(MOTION.indexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced.length, "there is no reduced-motion block at all").toBeGreaterThan(0)
    for (const token of [
      "--dur-instant",
      "--dur-fast",
      "--dur-base",
      "--dur-slow",
      "--dur-deliberate",
    ]) {
      expect(reduced, `${token} is not neutralised for reduced motion`).toContain(token)
    }
  })

  it("also neutralises animation and transition duration wholesale", () => {
    const reduced = MOTION.slice(MOTION.indexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toContain("animation-duration")
    expect(reduced).toContain("transition-duration")
  })

  it("eases out rather than bouncing", () => {
    expect(MOTION).toContain("--ease-out-quart")
    expect(MOTION).toContain("--ease-out-expo")
    expect(MOTION, "bounce and elastic curves are banned").not.toMatch(
      /cubic-bezier\([^)]*-[01]\.[0-9]/,
    )
  })

  it("defines every keyframe that a stylesheet animates", async () => {
    const declared = new Set(
      [...MOTION.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1]),
    )
    const missing: string[] = []
    for (const file of await stylesheets()) {
      const source = readFileSync(file, "utf8")
      const local = new Set([...source.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1]))
      for (const m of source.matchAll(/animation:\s*([a-z0-9-]+)/g)) {
        const name = m[1] ?? ""
        if (name === "none" || name === "inherit" || name === "initial" || name === "unset") {
          continue
        }
        if (!declared.has(name) && !local.has(name)) {
          missing.push(`${file} animates ${name}, which no keyframe defines`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("animates only compositor-friendly properties in its keyframes", () => {
    const blocks = MOTION.match(/@keyframes[\s\S]*?\n}/g) ?? []
    expect(blocks.length).toBeGreaterThan(0)
    const banned = /\n\s*(width|height|top|left|right|bottom|margin|padding)\s*:/
    for (const block of blocks) {
      expect(block, "animating a layout property forces reflow every frame").not.toMatch(banned)
    }
  })
})
