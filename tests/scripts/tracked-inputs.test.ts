import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return name === "node_modules" ? [] : sources(path)
    }
    return /\.(ts|tsx|mjs)$/.test(name) ? [path] : []
  })
}

function literalReads(): { file: string; path: string }[] {
  const reads: { file: string; path: string }[] = []
  for (const file of [...sources("tests"), ...sources("scripts")]) {
    const text = readFileSync(file, "utf8")
    for (const match of text.matchAll(/readFileSync\(\s*"([^"]+\.[a-z]+)"/g)) {
      if (match[1] !== undefined) {
        reads.push({ file, path: match[1] })
      }
    }
  }
  return reads
}

describe("a test or script reads only files the repository ships", () => {
  const tracked = new Set(
    execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean),
  )

  it("finds literal reads to check, so the scan itself is not empty", () => {
    expect(literalReads().length).toBeGreaterThan(0)
  })

  it("never reads an untracked file, which passes locally and fails in CI", () => {
    for (const { file, path } of literalReads()) {
      expect(
        tracked.has(path),
        `${file} reads ${path}, which git does not track; CI checks out only tracked files`,
      ).toBe(true)
    }
  })
})
