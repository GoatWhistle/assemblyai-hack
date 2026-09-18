import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { describe, expect, it } from "vitest"

async function pageShellStylesheets(): Promise<string[]> {
  const files: string[] = []
  for await (const file of glob("app/**/styles.module.css")) {
    files.push(file)
  }
  return files
}

describe("page shell centering", () => {
  it("centers a nested max-width block instead of letting it drift left on wide screens", async () => {
    const offenders: string[] = []
    for (const file of await pageShellStylesheets()) {
      const source = readFileSync(file, "utf8")
      const shellIsCentered = /\.shell\s*\{[^}]*margin:\s*0\s+auto/.test(source)
      if (!shellIsCentered) {
        continue
      }
      const pageBlock = source.match(/\.page\s*\{[^}]*\}/)?.[0]
      if (pageBlock === undefined) {
        continue
      }
      const hasOwnMaxWidth = /max-width:\s*(?!var\(--content-max\))\S/.test(pageBlock)
      if (!hasOwnMaxWidth) {
        continue
      }
      const centersItself = /margin(-inline)?:\s*(0\s+auto|auto)/.test(pageBlock)
      if (!centersItself) {
        offenders.push(
          `${file}: .page declares its own max-width inside an already-centered .shell but never centers itself, so it drifts to the left edge on wide screens`,
        )
      }
    }
    expect(offenders).toEqual([])
  })
})
