#!/usr/bin/env -S npx tsx

import { drugCount, loadCatalog } from "../../src/catalog"

type CollisionKind = "punctuation_only" | "registry_misspelling" | "distinct_drugs"

export type Collision = {
  readonly skeleton: string
  readonly names: readonly string[]
  readonly kind: CollisionKind
}

function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function editDistance(a: string, b: string): number {
  const cols = b.length + 1
  let previous = Array.from({ length: cols }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...Array.from({ length: cols - 1 }, () => 0)]
    for (let j = 1; j < cols; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min(substitution, (previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1)
    }
    previous = current
  }
  return previous[cols - 1] ?? 0
}

function isSingleTransposition(a: string, b: string): boolean {
  const differing: number[] = []
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      differing.push(i)
    }
  }
  if (differing.length !== 2) {
    return false
  }
  const [first, second] = differing
  if (first === undefined || second === undefined) {
    return false
  }
  return a[first] === b[second] && a[second] === b[first]
}

function classify(names: readonly string[]): CollisionKind {
  const bare = names.map((name) => letters(name))
  if (new Set(bare).size === 1) {
    return "punctuation_only"
  }
  for (let i = 0; i < bare.length; i += 1) {
    for (let j = i + 1; j < bare.length; j += 1) {
      const a = bare[i]
      const b = bare[j]
      if (a === undefined || b === undefined || a === b) {
        continue
      }
      if (Math.abs(a.length - b.length) <= 1 && editDistance(a, b) <= 1) {
        return "registry_misspelling"
      }
      if (a.length === b.length && isSingleTransposition(a, b)) {
        return "registry_misspelling"
      }
    }
  }
  return "distinct_drugs"
}

export function collisions(): readonly Collision[] {
  const index = loadCatalog()
  const out: Collision[] = []
  for (const [skeleton, names] of index.bySkeleton) {
    if (names.length > 1 && skeleton.length >= 4) {
      const sorted = Object.freeze([...names].sort())
      out.push({ skeleton, names: sorted, kind: classify(sorted) })
    }
  }
  return Object.freeze(out.sort((a, b) => a.skeleton.localeCompare(b.skeleton)))
}

const KIND_LABEL: Readonly<Record<CollisionKind, string>> = Object.freeze({
  punctuation_only: "same name, different punctuation",
  registry_misspelling: "one name is misspelled in the FDA registry",
  distinct_drugs: "two genuinely different drugs",
})

function main(): void {
  const index = loadCatalog()
  const rows = collisions()
  const total = drugCount(index)

  const byKind = (kind: CollisionKind) => rows.filter((row) => row.kind === kind)
  const misspellings = byKind("registry_misspelling")
  const distinct = byKind("distinct_drugs")

  console.log(
    `catalogue self-audit: the same consonant-skeleton detector the gate uses, pointed at the ${total} prescription products we ship`,
  )
  console.log("")
  console.log(
    `${rows.length} skeletons are shared by more than one catalogue name: ${byKind("punctuation_only").length} are one name punctuated two ways, ${misspellings.length} are a spelling error in the FDA registry itself, and ${distinct.length} are genuinely different drugs a vowel substitution would confuse`,
  )
  console.log(`${index.bySkeleton.size} distinct skeletons are indexed over ${total} products`)
  console.log("")
  console.log("| Skeleton | Names sharing it | What it is |")
  console.log("|---|---|---|")
  for (const row of [...misspellings, ...distinct]) {
    console.log(`| \`${row.skeleton}\` | ${row.names.join(", ")} | ${KIND_LABEL[row.kind]} |`)
  }
  console.log("")
  console.log(
    "the last group is the one that matters: a shared skeleton between two real drugs is exactly the condition under which a vowel substitution is unrecoverable from the audio alone, which is why the gate names the neighbours instead of choosing between them",
  )
  console.log("")
  console.log(
    "the middle group is a finding about the source data rather than about us, and it is the reason the catalogue check refuses an unknown name instead of correcting it to the nearest known one",
  )
}

if (process.argv[1]?.includes("audit-catalog")) {
  main()
}
