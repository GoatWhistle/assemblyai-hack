import { execFile } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { beforeAll, describe, expect, it } from "vitest"
import {
  type Anchor,
  figuresLocated,
  PUBLIC_DOCUMENTS,
  type PublicDocument,
  VITEST_LIST,
} from "./public-figure-anchor"
import { CITED, OWN_CITED, VENDOR_FIGURES, VENDOR_SOURCES } from "./public-figure-citations"
import { MEASURED_ANCHORS } from "./public-figures-measured"
import { STRUCTURAL_ANCHORS } from "./public-figures-structural"

const ANCHORS: readonly Anchor[] = [...MEASURED_ANCHORS, ...STRUCTURAL_ANCHORS]
const SLOW = 240_000
const GATHER = 600_000
const BUFFER = 64 * 1024 * 1024
const run = promisify(execFile)
const evidence = new Map<string, string>()

function childEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env }
  for (const key of Object.keys(environment)) {
    if (key.startsWith("VITEST")) {
      Reflect.deleteProperty(environment, key)
    }
  }
  return environment
}

async function listTests(): Promise<string> {
  const scratch = mkdtempSync(join(tmpdir(), "public-figures-"))
  try {
    const target = join(scratch, "tests.json")
    await run(
      "npx",
      ["vitest", "list", "--config", "tests/vitest.config.ts", `--json="${target}"`],
      {
        encoding: "utf8",
        shell: true,
        env: childEnvironment(),
        timeout: SLOW,
        maxBuffer: BUFFER,
      },
    )
    return readFileSync(target, "utf8")
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

async function produce(source: string): Promise<string> {
  if (source === VITEST_LIST) {
    return listTests()
  }
  if (source.startsWith("npx ")) {
    const [bin, ...args] = source.split(" ")
    const { stdout } = await run(bin ?? "npx", args, {
      encoding: "utf8",
      shell: true,
      timeout: SLOW,
      maxBuffer: BUFFER,
    })
    return stdout
  }
  return readFileSync(source, "utf8")
}

beforeAll(async () => {
  const sources = [...new Set(ANCHORS.map((anchor) => anchor.source))]
  const gathered = await Promise.all(
    sources.map(async (source) => [source, await produce(source)] as const),
  )
  for (const [source, produced] of gathered) {
    evidence.set(source, produced)
  }
}, GATHER)

function evidenceFor(source: string): string {
  const gathered = evidence.get(source)
  if (gathered === undefined) {
    throw new Error(`no evidence was gathered for ${source}`)
  }
  return gathered
}

function documentText(document: PublicDocument): string {
  return readFileSync(document, "utf8")
}

function disagreements(text: string, anchor: Anchor, reproduced: string): readonly string[] {
  const located = figuresLocated(text, anchor.locate)
  if (located.length === 0) {
    return [`${anchor.locate} matches nothing in ${anchor.document}; the anchor is stale`]
  }
  return located
    .filter((figure) => figure !== reproduced)
    .map(
      (figure) =>
        `${anchor.document} states "${figure}" where "${anchor.source}" reproduces "${reproduced}"`,
    )
}

function perturbed(text: string, anchor: Anchor): string {
  const found = new RegExp(anchor.locate.source, anchor.locate.flags.replace("g", "")).exec(
    text,
  )
  if (found === null) {
    return text
  }
  const whole = found[0]
  const changed = /\d/.test(whole)
    ? whole.replace(/\d/, (digit) => String((Number(digit) + 1) % 10))
    : whole.replace(/\w+/, (word) => `${word}x`)
  return text.slice(0, found.index) + changed + text.slice(found.index + whole.length)
}

function unanchoredFigures(document: PublicDocument, text: string): readonly string[] {
  const spans = ANCHORS.filter((anchor) => anchor.document === document).flatMap((anchor) => {
    const flags = anchor.locate.flags.includes("g")
      ? anchor.locate.flags
      : `${anchor.locate.flags}g`
    return [...text.matchAll(new RegExp(anchor.locate.source, flags))].map(
      (found) => [found.index, found.index + found[0].length] as const,
    )
  })
  const cited = new Set(
    CITED.filter((entry) => entry.document === document).map((c) => c.figure),
  )
  return [...text.matchAll(/\d[\d,]*(?:\.\d+)?%|\b\d[\d,]* tests\b/g)]
    .filter((found) => !cited.has(found[0]))
    .filter((found) => !spans.some(([start, end]) => found.index >= start && found.index < end))
    .map((found) => found[0])
}

describe("every figure in README.md and the slides agrees with the command that reproduces it", () => {
  for (const anchor of ANCHORS) {
    it(
      `${anchor.document} ${anchor.locate} agrees with ${anchor.source}`,
      { timeout: SLOW },
      () => {
        const reproduced = anchor.reproduce(evidenceFor(anchor.source))
        expect(disagreements(documentText(anchor.document), anchor, reproduced)).toEqual([])
      },
    )
  }

  for (const document of PUBLIC_DOCUMENTS) {
    it(`${document} states no percentage or test count that is neither anchored nor cited`, () => {
      expect(unanchoredFigures(document, documentText(document))).toEqual([])
    })
  }

  it("every own citation still appears, so a citation that guards nothing is removed", () => {
    for (const entry of OWN_CITED) {
      expect(documentText(entry.document), entry.reason).toContain(entry.figure)
    }
  })

  it("every vendor figure allowed unanchored is quoted with its source in docs/sources.md", () => {
    const sources = readFileSync(VENDOR_SOURCES, "utf8")
    for (const figure of VENDOR_FIGURES) {
      expect(
        sources,
        `${figure} may stand unanchored only because docs/sources.md quotes the vendor sentence it comes from`,
      ).toContain(figure)
    }
  })
})

describe("the agreement check fails when a figure is wrong", () => {
  for (const anchor of ANCHORS) {
    it(
      `a perturbed copy of ${anchor.document} breaks ${anchor.locate}`,
      { timeout: SLOW },
      () => {
        const reproduced = anchor.reproduce(evidenceFor(anchor.source))
        const copy = perturbed(documentText(anchor.document), anchor)
        expect(disagreements(copy, anchor, reproduced).length).toBeGreaterThan(0)
      },
    )
  }

  it("an unanchored percentage added to a copy of each document is reported", () => {
    for (const document of PUBLIC_DOCUMENTS) {
      const copy = `${documentText(document)}\nan invented rate of 12.3% appeared\n`
      expect(unanchoredFigures(document, copy)).toContain("12.3%")
    }
  })
})
