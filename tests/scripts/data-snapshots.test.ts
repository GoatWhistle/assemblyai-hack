import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DATA_SNAPSHOTS,
  sealSnapshot,
  snapshotVerdict,
  snapshotVerdictOf,
} from "../../scripts/build/snapshot"

const SOURCE = {
  builtAt: "2026-09-25T00:00:00.000Z",
  sourceUrl: "https://example.test/source.zip",
  rows: [{ b: 2, a: 1 }],
}

describe("committed data snapshots", () => {
  for (const path of DATA_SNAPSHOTS) {
    it(`${path} is present, stamped and matches its recorded sha256`, () => {
      const verdict = snapshotVerdict(path)
      expect(verdict.status, verdict.status === "valid" ? path : verdict.detail).toBe("valid")
    })
  }

  it("the catalogue snapshot names the FDA source it was built from", () => {
    const verdict = snapshotVerdict("data/catalog.json")
    expect(verdict.status === "valid" && verdict.stamp.sourceUrl).toBe(
      "https://www.accessdata.fda.gov/cder/ndctext.zip",
    )
  })
})

describe("the snapshot check fails in both directions it guards", () => {
  it("a missing file is missing, never valid", () => {
    expect(snapshotVerdict("data/no-such-snapshot.json").status).toBe("missing")
  })

  it("a file without a digest is unsealed", () => {
    expect(snapshotVerdictOf(JSON.stringify(SOURCE)).status).toBe("unsealed")
  })

  it("a sealed file verifies whatever order its keys were written in", () => {
    const sealed = sealSnapshot(SOURCE)
    const reordered = {
      sha256: sealed.sha256,
      rows: [{ a: 1, b: 2 }],
      sourceUrl: SOURCE.sourceUrl,
      builtAt: SOURCE.builtAt,
    }
    expect(snapshotVerdictOf(JSON.stringify(reordered)).status).toBe("valid")
  })

  it("one edited value after sealing is a mismatch", () => {
    const sealed = sealSnapshot(SOURCE)
    const edited = { ...sealed, rows: [{ a: 1, b: 3 }] }
    expect(snapshotVerdictOf(JSON.stringify(edited)).status).toBe("mismatch")
  })

  it("one edited byte of the real catalogue is a mismatch", () => {
    const raw = readFileSync("data/catalog.json", "utf8")
    const edited = raw.replace('"deaSchedule":null', '"deaSchedule":"CII"')
    expect(edited).not.toBe(raw)
    expect(snapshotVerdictOf(edited).status).toBe("mismatch")
  })
})

const DOWNLOAD_MARKERS: readonly string[] = [
  "ndctext.zip",
  "ConfusedDrugNames",
  "node:child_process",
  "scripts/build/",
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe("the product path reads the snapshots and never rebuilds them", () => {
  it("no file under src or app downloads a source or runs a build script", () => {
    const offenders = ["src", "app"].flatMap(sourceFiles).filter((path) => {
      const text = readFileSync(path, "utf8")
      return DOWNLOAD_MARKERS.some((marker) => text.includes(marker))
    })
    expect(offenders).toEqual([])
  })
})
