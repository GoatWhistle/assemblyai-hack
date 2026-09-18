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

const NON_NAMES = new Set(["none", "inherit", "initial", "unset"])

function keyframeNamesIn(source: string): Set<string> {
  return new Set([...source.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1] ?? ""))
}

function resolveAnimationName(raw: string): string {
  const token = raw.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/)
  if (token === null) {
    return raw
  }
  return MOTION.match(new RegExp(`${token[1]}:\\s*([a-z0-9-]+);`))?.[1] ?? raw
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
    const declared = keyframeNamesIn(MOTION)
    const missing: string[] = []
    for (const file of await stylesheets()) {
      const source = readFileSync(file, "utf8")
      const local = keyframeNamesIn(source)
      for (const m of source.matchAll(/animation:\s*(var\(\s*--[a-z0-9-]+\s*\)|[a-z0-9-]+)/g)) {
        const name = resolveAnimationName(m[1] ?? "")
        if (NON_NAMES.has(name) || declared.has(name) || local.has(name)) {
          continue
        }
        missing.push(`${file} animates ${name}, which no keyframe defines`)
      }
    }
    expect(missing).toEqual([])
  })

  it("reaches its global keyframes through a token, because a module renames a bare name", async () => {
    const renamed: string[] = []
    for (const file of await stylesheets()) {
      if (!file.endsWith(".module.css")) {
        continue
      }
      const source = readFileSync(file, "utf8")
      const local = keyframeNamesIn(source)
      for (const m of source.matchAll(/animation:\s*([a-z0-9-]+)/g)) {
        const name = m[1] ?? ""
        if (NON_NAMES.has(name) || name === "var" || local.has(name)) {
          continue
        }
        renamed.push(
          `${file} animates ${name} by bare name; CSS Modules rewrites it and the animation silently never runs`,
        )
      }
    }
    expect(renamed).toEqual([])
  })

  it("exposes a token for every keyframe it declares, so modules can reach them", () => {
    const declared = [...keyframeNamesIn(MOTION)]
    const tokenValues = new Set(
      [...MOTION.matchAll(/--keyframes-[a-z-]+:\s*([a-z0-9-]+);/g)].map((m) => m[1]),
    )
    const unreachable = declared.filter(
      (name) => !tokenValues.has(name) && !name.startsWith("readback-route-"),
    )
    expect(
      unreachable,
      "a keyframe no token names cannot be used from a CSS module at all",
    ).toEqual([])
  })

  it("gives the gate's verdict its own entrance, so a refusal is not delivered in silence", () => {
    const banner = readFileSync("src/features/gate-banner/styles.module.css", "utf8")
    for (const severity of ["asking", "lasa", "escalated"]) {
      const block = banner.match(new RegExp(`\\.${severity}\\s*\\{[^}]*\\}`))?.[0] ?? ""
      expect(
        block,
        `the ${severity} verdict arrives with no motion at all, so a new decision cannot be told from the previous one`,
      ).toContain("animation:")
    }
  })

  it("separates a refusal from an acceptance in motion, not only in colour", () => {
    const banner = readFileSync("src/features/gate-banner/styles.module.css", "utf8")
    const nameIn = (severity: string) =>
      banner.match(
        new RegExp(`\\.${severity}\\s*\\{[^}]*animation:\\s*var\\((--keyframes-[a-z-]+)\\)`),
      )?.[1]
    const accepted = nameIn("accepted")
    const refused = nameIn("lasa")
    expect(accepted).toBeDefined()
    expect(refused).toBeDefined()
    expect(
      refused,
      "a refusal that enters exactly like an acceptance undercuts the claim that it was a considered decision",
    ).not.toEqual(accepted)
  })

  it("gives the LASA re-ask its own motion, distinct from an ordinary re-ask", () => {
    const banner = readFileSync("src/features/gate-banner/styles.module.css", "utf8")
    const nameIn = (severity: string) =>
      banner.match(
        new RegExp(`\\.${severity}\\s*\\{[^}]*animation:\\s*var\\((--keyframes-[a-z-]+)\\)`),
      )?.[1]
    const durationIn = (severity: string) =>
      banner.match(
        new RegExp(
          `\\.${severity}\\s*\\{[^}]*animation:\\s*var\\(--keyframes-[a-z-]+\\)\\s*var\\((--dur-[a-z-]+)\\)`,
        ),
      )?.[1]
    const ordinary = nameIn("asking")
    const lasa = nameIn("lasa")
    expect(ordinary).toBeDefined()
    expect(lasa).toBeDefined()
    expect(
      lasa,
      "the published-pair re-ask fires regardless of confidence, which is the product's central claim; it must read as a different, weightier decision than a plain low-confidence or validator re-ask, not the same animation with a different colour",
    ).not.toEqual(ordinary)
    expect(durationIn("lasa")).not.toEqual(durationIn("asking"))
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
