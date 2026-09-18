import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { describe, expect, it } from "vitest"

async function stylesheets(): Promise<string[]> {
  const files: string[] = []
  for await (const file of glob("src/**/*.css")) {
    files.push(file)
  }
  for await (const file of glob("app/**/*.css")) {
    files.push(file)
  }
  return files
}

const ALLOWED_DIVIDER = /border-left:\s*1px\s+solid\s+var\(--line-hairline\)/

describe("no decorative side-stripe", () => {
  it("refuses a coloured border-left or border-right used as an accent", async () => {
    const offenders: string[] = []
    for (const file of await stylesheets()) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(
        /border-(left|right):\s*(\d+(?:\.\d+)?px)\s+solid\s+(var\(--[a-z0-9-]+\)|oklch\([^)]*\)|#[0-9a-fA-F]+)/g,
      )) {
        const rule = match[0]
        if (rule === "border-left: 1px solid var(--line-hairline)") {
          continue
        }
        if (ALLOWED_DIVIDER.test(rule)) {
          continue
        }
        offenders.push(`${file}: ${rule}`)
      }
    }
    expect(
      offenders,
      "a coloured border-left/border-right on prose reads as an AI-generated accent stripe; this project already removed one on .truth and it must not come back. Use a tinted surface or a hairline frame instead",
    ).toEqual([])
  })
})
