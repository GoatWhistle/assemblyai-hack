import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SCRIPT_DIR = "scripts"

const ENTRY_GUARD = /if\s*\(\s*process\.argv\[1\]\?\.includes\(/

const PAID_SIGNAL = /new WebSocket\(|transcribeItem\(/

const UNCONDITIONAL_MAIN_CALL = /^\s*(void\s+)?main\(\)\.?(catch\([\s\S]*?\)\s*)?$/m

function scriptFiles(dir: string = SCRIPT_DIR): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      return scriptFiles(path)
    }
    return entry.name.endsWith(".ts") ? [path] : []
  })
}

function tailAfterLastMainCall(source: string): string {
  const lines = source.split("\n")
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (UNCONDITIONAL_MAIN_CALL.test(lines[index] ?? "")) {
      return lines.slice(Math.max(0, index - 3), index + 1).join("\n")
    }
  }
  return ""
}

function opensAPaidPathAtImport(source: string): boolean {
  if (!PAID_SIGNAL.test(source)) {
    return false
  }
  const tail = tailAfterLastMainCall(source)
  if (tail.length === 0) {
    return false
  }
  return !ENTRY_GUARD.test(tail)
}

describe("a script that opens a paid socket must not do so merely by being imported", () => {
  it("scans a real population of scripts", () => {
    expect(
      scriptFiles().length,
      "this file is vacuous if the walk found nothing",
    ).toBeGreaterThan(30)
  })

  it("requires an entry-point guard on every script whose main() touches a paid socket", () => {
    const offenders: string[] = []
    for (const path of scriptFiles()) {
      const source = readFileSync(path, "utf8")
      if (opensAPaidPathAtImport(source)) {
        offenders.push(
          `${path} constructs a paid socket and calls its main unconditionally on import, which is the defect scripts/measure/measure-eer.ts once had: importing anything from it ran the whole paid path`,
        )
      }
    }
    expect(offenders.sort()).toEqual([])
  })

  it("has a working positive control: an unguarded paid script is detected", () => {
    const unguarded = [
      'import WebSocket from "ws"',
      "async function main(): Promise<void> {",
      '  const socket = new WebSocket("wss://example")',
      "}",
      "",
      "void main()",
      "",
    ].join("\n")
    expect(
      opensAPaidPathAtImport(unguarded),
      "the detector must catch the exact shape scripts/measure/measure-eer.ts shipped with before it was fixed",
    ).toBe(true)
  })

  it("has a working negative control: a guarded paid script passes", () => {
    const guarded = [
      'import WebSocket from "ws"',
      "async function main(): Promise<void> {",
      '  const socket = new WebSocket("wss://example")',
      "}",
      "",
      'if (process.argv[1]?.includes("probe")) {',
      "  void main()",
      "}",
      "",
    ].join("\n")
    expect(
      opensAPaidPathAtImport(guarded),
      "a script guarded the same way scripts/measure/measure-eer.ts was fixed must not be flagged",
    ).toBe(false)
  })

  it("has a working negative control: a pure library with no entry call is never flagged", () => {
    const library = [
      'import WebSocket from "ws"',
      "export async function transcribeItem(): Promise<void> {",
      '  const socket = new WebSocket("wss://example")',
      "}",
      "",
    ].join("\n")
    expect(
      opensAPaidPathAtImport(library),
      "scripts/eer/transcribe.ts is exactly this shape: it constructs a WebSocket inside an exported function and calls nothing at module scope, so importing it opens no socket",
    ).toBe(false)
  })
})
