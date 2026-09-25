import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { ManifestItem, TranscriptResult } from "../../scripts/eer/transcribe"
import { type SweepDeps, transcribeAll } from "../../scripts/measure/measure-eer"

function connectTimeout(): Error {
  const cause = Object.assign(new Error("Connect Timeout Error"), {
    code: "UND_ERR_CONNECT_TIMEOUT",
  })
  return new TypeError("fetch failed", { cause })
}
describe("a sweep resumes from its partial file and records exhausted items instead of crashing", () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  function item(name: string): ManifestItem {
    return {
      file: `eval/stress/audio/phone/${name}.wav`,
      spoken: name,
      carrier: `The drug name is ${name}.`,
      voice: "v",
      entityType: "drug_name",
    }
  }

  function resultOf(entry: ManifestItem): TranscriptResult {
    return {
      item: entry,
      transcript: entry.carrier,
      words: [],
      closeCode: 1000,
      socketMs: 1000,
      audioSeconds: 1,
      openMs: 10,
      firstPartialMs: 100,
      finalizationMs: 200,
      turnCount: 1,
    }
  }

  function sweep(
    failing: ReadonlySet<string>,
  ): SweepDeps & { called: string[]; lines: string[] } {
    const called: string[] = []
    const lines: string[] = []
    return {
      called,
      lines,
      spacingMs: 0,
      sleep: async () => {},
      log: (line) => {
        lines.push(line)
      },
      transcribe: async (entry) => {
        called.push(entry.spoken)
        if (failing.has(entry.spoken)) {
          throw connectTimeout()
        }
        return resultOf(entry)
      },
    }
  }

  it("skips scored items, continues, and keeps a failed item as a record with its error", async () => {
    const dir = mkdtempSync(join(tmpdir(), "eer-resume-"))
    dirs.push(dir)
    const partialPath = join(dir, "result-plain.partial.json")
    const items = [item("hydralazine"), item("hydroxyzine"), item("morphine")]
    writeFileSync(
      partialPath,
      JSON.stringify({ results: [resultOf(items[0] as ManifestItem)] }),
    )

    const first = sweep(new Set(["hydroxyzine"]))
    const run = await transcribeAll(items, "key", [], partialPath, first)

    expect(first.called).toEqual(["hydroxyzine", "morphine"])
    expect(first.lines[0]).toContain("resumed 1 scored item(s)")
    expect(first.lines[0]).toContain("2 remaining")
    expect(run.results.map((r) => r.item.spoken)).toEqual(["hydralazine", "morphine"])
    expect(run.failed.map((f) => f.item.spoken)).toEqual(["hydroxyzine"])
    expect(run.failed[0]?.error).toContain("UND_ERR_CONNECT_TIMEOUT")

    const onDisk = JSON.parse(readFileSync(partialPath, "utf8")) as {
      results: TranscriptResult[]
      failed: { item: ManifestItem }[]
    }
    expect(onDisk.results).toHaveLength(2)
    expect(onDisk.failed).toHaveLength(1)

    const second = sweep(new Set())
    const rerun = await transcribeAll(items, "key", [], partialPath, second)
    expect(second.called, "a failed item was never scored, so a resume tries it again").toEqual(
      ["hydroxyzine"],
    )
    expect(rerun.results.map((r) => r.item.spoken)).toEqual([
      "hydralazine",
      "hydroxyzine",
      "morphine",
    ])
    expect(rerun.failed).toEqual([])
  })

  it("starts from nothing when there is no partial file and prints no resume line", async () => {
    const dir = mkdtempSync(join(tmpdir(), "eer-resume-"))
    dirs.push(dir)
    const deps = sweep(new Set())
    const run = await transcribeAll(
      [item("a"), item("b")],
      "key",
      [],
      join(dir, "p.json"),
      deps,
    )
    expect(deps.called).toEqual(["a", "b"])
    expect(deps.lines.some((line) => line.includes("resumed"))).toBe(false)
    expect(run.results).toHaveLength(2)
  })
})
