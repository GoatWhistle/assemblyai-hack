import { LasaSource } from "@/domain"
import type { LasaPair } from "@/lasa"
import { normalizeTerm } from "@/lasa"

const TALL_MAN = /^[A-Za-z][A-Za-z0-9-]{3,}$/

function looksLikeDrugName(token: string): boolean {
  return TALL_MAN.test(token) && normalizeTerm(token).length >= 4
}

export function parseTablePairs(text: string): readonly LasaPair[] {
  const pairs: LasaPair[] = []
  const seen = new Set<string>()

  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .split(/\s{2,}/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    if (cells.length < 2) {
      continue
    }

    const left = cells[0]
    const right = cells[1]
    if (left === undefined || right === undefined) {
      continue
    }
    if (!looksLikeDrugName(left) || !looksLikeDrugName(right)) {
      continue
    }

    const a = normalizeTerm(left)
    const b = normalizeTerm(right)
    if (a === b) {
      continue
    }
    const key = [a, b].sort().join("|")
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    pairs.push({
      termA: a,
      termB: b,
      source: LasaSource.Ismp2023,
      sourceRow: `ISMP List of Confused Drug Names, parsed row: ${left} - ${right}`,
    })
  }

  return pairs
}
