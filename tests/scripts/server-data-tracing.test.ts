import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import config, { SERVER_DATA_FILES } from "../../next.config"

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return sources(path)
    }
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

function runtimeDataPaths(): string[] {
  const found = new Set<string>()
  for (const file of sources("src")) {
    const text = readFileSync(file, "utf8")
    if (!text.includes("readFileSync")) {
      continue
    }
    for (const match of text.matchAll(/"(data\/[\w.-]+\.json)"/g)) {
      if (match[1] !== undefined) {
        found.add(match[1])
      }
    }
  }
  return [...found]
}

describe("a data file the server reads from disk ships inside the serverless function", () => {
  it("finds the catalogue among the files read at runtime, so the scan itself is not empty", () => {
    expect(runtimeDataPaths()).toContain("data/catalog.json")
  })

  it("traces every runtime data file into every API route, because the bundler cannot see a readFileSync path", () => {
    expect(config.outputFileTracingIncludes).toBe(SERVER_DATA_FILES)
    const traced = SERVER_DATA_FILES["/api/**/*"].map((path) => path.replace(/^\.\//, ""))
    for (const path of runtimeDataPaths()) {
      expect(
        traced,
        `${path} is read with readFileSync but not traced; on Vercel it is absent and every catalogue lookup answers 500`,
      ).toContain(path)
    }
  })
})
