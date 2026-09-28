import { readFileSync } from "node:fs"
import { LASA_PAIRS } from "@/lasa"
import { STEPS } from "../../scripts/report/honest"
import {
  type Anchor,
  capitalised,
  capture,
  integer,
  type PublicDocument,
  spelled,
  VITEST_LIST,
} from "./public-figure-anchor"

const README: PublicDocument = "README.md"
const DECK: PublicDocument = "src/features/deck/invariant-slide/index.tsx"
const EVIDENCE: PublicDocument = "docs/evidence.md"
const LIMITATIONS: PublicDocument = "docs/limitations.md"
const SECURITY: PublicDocument = "docs/security.md"
const VERIFICATION: PublicDocument = "docs/verification.md"

const MUTATIONS = "scripts/checks/gate-mutations.txt"
const MAKEFILE = "Makefile"
const PAIRS = "src/lasa/pairs.ts"
const HONEST = "scripts/report/honest.ts"
const SET_NAMES: Readonly<Record<string, string>> = {
  "eval/dev": "development",
  "eval/control": "control",
  "eval/heldout": "sealed held-out",
}

type ListedTest = { readonly name: string; readonly file: string }

function listedTests(evidence: string): readonly ListedTest[] {
  const parsed: unknown = JSON.parse(evidence)
  if (!Array.isArray(parsed)) {
    throw new Error("vitest list did not print an array")
  }
  return parsed as ListedTest[]
}

function testsIn(file: string): (evidence: string) => string {
  return (evidence) => {
    const count = listedTests(evidence).filter((test) =>
      test.file.replaceAll("\\", "/").endsWith(file),
    ).length
    return capitalised(spelled(count))
  }
}

function mutationCount(evidence: string): number {
  return evidence.split(/\r?\n/).filter((line) => line.trim().length > 0).length
}

function evalSet(makefile: string): string {
  return capture(makefile, /^eval:\r?\n\t.*--set (\S+?)"?$/m)[0] ?? ""
}

function constant(name: string): (evidence: string) => string {
  return (evidence) => String(integer(evidence, new RegExp(`export const ${name} = (\\d+)`)))
}

const pairCount = (): string => String(LASA_PAIRS.length)

export const STRUCTURAL_ANCHORS: readonly Anchor[] = [
  ...[README, EVIDENCE, VERIFICATION].map(
    (document): Anchor => ({
      document,
      locate: /(\d+ of \d+) mutations killed/,
      source: MUTATIONS,
      reproduce: (evidence) => `${mutationCount(evidence)} of ${mutationCount(evidence)}`,
    }),
  ),
  {
    document: VERIFICATION,
    locate: /all (\w+) mutations/,
    source: MUTATIONS,
    reproduce: (evidence) => spelled(mutationCount(evidence)),
  },
  ...[DECK].map(
    (document): Anchor => ({
      document,
      locate: /value: "(\d+ \/ \d+)"/,
      source: MUTATIONS,
      reproduce: (evidence) => `${mutationCount(evidence)} / ${mutationCount(evidence)}`,
    }),
  ),
  {
    document: VERIFICATION,
    locate: /(\w+) blocks, no network call/,
    source: HONEST,
    reproduce: () => capitalised(spelled(STEPS.length)),
  },
  {
    document: LIMITATIONS,
    locate: /(\w+) tests in\s+`tests\/confirmation\/retracted-span\.test\.ts`/,
    source: VITEST_LIST,
    reproduce: testsIn("tests/confirmation/retracted-span.test.ts"),
  },
  { document: README, locate: /(\d+) curated pairs/, source: PAIRS, reproduce: pairCount },
  { document: LIMITATIONS, locate: /holds (\d+) pairs/, source: PAIRS, reproduce: pairCount },
  {
    document: EVIDENCE,
    locate: /(\d+) hand-curated pairs/,
    source: PAIRS,
    reproduce: pairCount,
  },
  {
    document: VERIFICATION,
    locate: /\| `make eval` \| \*\*yes\*\* \| The ([\w -]+?) set,/,
    source: MAKEFILE,
    reproduce: (evidence) => SET_NAMES[evalSet(evidence)] ?? evalSet(evidence),
  },
  {
    document: VERIFICATION,
    locate: /\| `make eval` \| \*\*yes\*\* \| [^|\n]*?(\d+) sessions/,
    source: MAKEFILE,
    reproduce: (evidence) => {
      const manifest: unknown = JSON.parse(
        readFileSync(`${evalSet(evidence)}/manifest.json`, "utf8"),
      )
      const items = (manifest as { readonly items?: readonly unknown[] }).items
      return String(items?.length ?? "no items array")
    },
  },
  {
    document: SECURITY,
    locate: /at\s+most (\d+) characters/,
    source: "src/domain/session.ts",
    reproduce: constant("MAX_SESSION_ID_CHARS"),
  },
  {
    document: SECURITY,
    locate: /at most (\d+) words per turn/,
    source: "app/api/sessions/[id]/turns/route.ts",
    reproduce: constant("MAX_WORDS_PER_TURN"),
  },
  {
    document: SECURITY,
    locate: /(\d+) turns per session/,
    source: "src/tools/intake.ts",
    reproduce: constant("MAX_TURNS_PER_SESSION"),
  },
  {
    document: SECURITY,
    locate: /(\d+) concurrent sessions/,
    source: "src/tools/intake-events.ts",
    reproduce: constant("MAX_LIVE_SESSIONS"),
  },
  {
    document: VERIFICATION,
    locate: /No file over (\d+) lines/,
    source: "scripts/checks/file-length.sh",
    reproduce: (evidence) => String(integer(evidence, /^LIMIT=(\d+)$/m)),
  },
  {
    document: VERIFICATION,
    locate: /No directory over (\d+) sources \/ (\d+) tests/,
    source: "scripts/checks/package-size.sh",
    reproduce: (evidence) =>
      `${integer(evidence, /^SRC_LIMIT=(\d+)$/m)} | ${integer(evidence, /^TEST_LIMIT=(\d+)$/m)}`,
  },
]
