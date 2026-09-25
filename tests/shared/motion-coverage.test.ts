import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const MOTION_FILE = "src/styles/tokens/motion.css"
const MOTION = readFileSync(MOTION_FILE, "utf8")

const VERDICT_SHEETS = [
  "src/features/gate-banner/styles.module.css",
  "src/features/field-card/styles.module.css",
  "src/features/field-card/lasa-override/styles.module.css",
  "src/features/attack-console/styles.module.css",
  "src/features/gate-ledger/refusal-counter/styles.module.css",
] as const

const VERDICT_DURATIONS = new Set(["--dur-instant", "--dur-fast", "--dur-base"])

const FIRST_FRAME_FLOOR = 0.5

async function stylesheets(): Promise<string[]> {
  const files: string[] = []
  for (const pattern of ["src/**/*.css", "app/**/*.css"]) {
    for await (const file of glob(pattern)) {
      files.push(file.replaceAll("\\", "/"))
    }
  }
  return files
}

function motionDeclarations(source: string): string[] {
  return [
    ...source.matchAll(/(?:^|[;{\s])((?:animation|transition)[a-z-]*)\s*:\s*([^;]+);/g),
  ].map((m) => `${m[1]}: ${(m[2] ?? "").replace(/\s+/g, " ").trim()}`)
}

function keyframeStartOpacity(token: string): number {
  const name = MOTION.match(new RegExp(`${token}:\\s*([a-z0-9-]+);`))?.[1]
  const block = MOTION.match(new RegExp(`@keyframes ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? ""
  const first = block.match(/(?:from|0%)\s*\{([^}]*)\}/)?.[1] ?? ""
  const opacity = first.match(/opacity:\s*([\d.]+)/)?.[1]
  return opacity === undefined ? 1 : Number(opacity)
}

describe("AU11: every animated stylesheet takes its timing from the motion tokens", () => {
  it("writes no literal duration, delay or easing outside motion.css", async () => {
    const literals: string[] = []
    for (const file of await stylesheets()) {
      if (file === MOTION_FILE) {
        continue
      }
      for (const declaration of motionDeclarations(readFileSync(file, "utf8"))) {
        const bare = declaration.replace(/var\(--[a-z0-9-]+\)/g, "")
        if (
          /\b\d*\.?\d+m?s\b|cubic-bezier|steps\(|\blinear\b|\bease(-in|-out|-in-out)?\b/.test(
            bare,
          )
        ) {
          literals.push(`${file}: ${declaration}`)
        }
      }
    }
    expect(
      literals,
      "a literal duration or curve escapes the reduced-motion token collapse and drifts from the scale",
    ).toEqual([])
  })

  it("collapses every duration token it defines when reduced motion is asked for", () => {
    const [base, reduced] = MOTION.split("@media (prefers-reduced-motion: reduce)")
    const defined = [...(base ?? "").matchAll(/(--dur-[a-z-]+):/g)].map((m) => m[1] ?? "")
    expect(defined.length).toBeGreaterThan(0)
    const missing = defined.filter((token) => !(reduced ?? "").includes(`${token}: 1ms`))
    expect(missing).toEqual([])
  })

  it("stills animations and transitions globally, so a sheet without its own media query is covered", () => {
    const reduced = MOTION.slice(MOTION.indexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{/)
    expect(reduced).toMatch(/animation-duration:\s*1ms\s*!important/)
    expect(reduced).toMatch(/animation-iteration-count:\s*1\s*!important/)
    expect(reduced).toMatch(/transition-duration:\s*1ms\s*!important/)
    expect(readFileSync("src/styles/global.css", "utf8")).toContain(
      '@import "./tokens/motion.css"',
    )
    expect(readFileSync("app/layout.tsx", "utf8")).toContain('import "@/styles/global.css"')
  })

  it("lets no stylesheet override the reduced-motion collapse with its own !important timing", async () => {
    const overrides: string[] = []
    for (const file of await stylesheets()) {
      if (file === MOTION_FILE) {
        continue
      }
      for (const declaration of motionDeclarations(readFileSync(file, "utf8"))) {
        if (declaration.includes("!important")) {
          overrides.push(`${file}: ${declaration}`)
        }
      }
    }
    expect(overrides).toEqual([])
  })
})

describe("AU11: motion never delays a verdict", () => {
  for (const sheet of VERDICT_SHEETS) {
    it(`${sheet} shows its verdict in the first frame and settles within 180 ms`, () => {
      const source = readFileSync(sheet, "utf8")
      const animations = [
        ...source.matchAll(
          /animation:\s*var\((--keyframes-[a-z-]+)\)\s*var\((--dur-[a-z-]+)\)/g,
        ),
      ]
      expect(
        animations.length,
        `${sheet} no longer animates; drop it from the list`,
      ).toBeGreaterThan(0)
      for (const [, keyframes = "", duration = ""] of animations) {
        expect(VERDICT_DURATIONS.has(duration), `${keyframes} runs for ${duration}`).toBe(true)
        expect(
          keyframeStartOpacity(keyframes),
          `${keyframes} starts below ${FIRST_FRAME_FLOOR} opacity, so the verdict appears only after the animation`,
        ).toBeGreaterThanOrEqual(FIRST_FRAME_FLOOR)
      }
    })
  }

  it("does not animate running transcript text", () => {
    const source = readFileSync(
      "src/features/transcript-view/transcript-line/styles.module.css",
      "utf8",
    )
    const line = source.match(/\.line\s*\{[^}]*\}/)?.[0] ?? ""
    expect(
      line,
      "each new line of a live transcript sliding in is motion on the highest-frequency element",
    ).not.toContain("animation")
  })
})
