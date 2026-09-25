export type IsmpRow = {
  readonly page: number
  readonly row: number
  readonly drug: string
  readonly confused: string
}

export type IsmpParse = {
  readonly rows: readonly IsmpRow[]
  readonly unresolved: readonly { readonly page: number; readonly lines: readonly string[] }[]
}

const HEADER = "Drug Name Confused Drug Name"
const PAGE = /www\.ismp\.org \| (\d+)/
const STOPS: readonly RegExp[] = [
  /^Note:/,
  /^Updated through/,
  /All Rights Reserved/,
  /^ISMP List of/,
]
const MAX_GROUP_LINES = 10

export function cleanLine(line: string): string {
  return line
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function nameKey(name: string): string {
  return cleanLine(name).replace(/\*/g, "").toLowerCase()
}

function layoutSegments(layout: string): ReadonlySet<string> {
  const segments = new Set<string>()
  for (const line of layout.split(/\r?\n/)) {
    for (const cell of line.split(/\s{2,}/)) {
      const key = nameKey(cell)
      if (key.length > 0) {
        segments.add(key)
      }
    }
  }
  return segments
}

function balanced(text: string): boolean {
  let depth = 0
  for (const char of text) {
    if (char === "(" || char === "[") {
      depth += 1
    }
    if (char === ")" || char === "]") {
      depth -= 1
    }
    if (depth < 0) {
      return false
    }
  }
  return depth === 0
}

function joinLines(lines: readonly string[]): string {
  return lines.reduce((joined, line) =>
    joined.endsWith("-") ? `${joined}${line}` : `${joined} ${line}`,
  )
}

function cellShaped(text: string): boolean {
  return text.length > 0 && balanced(text) && !/[-,]$/.test(text) && !/^[)(\][]/.test(text)
}

function splitBySegments(line: string, segments: ReadonlySet<string>): [string, string] | null {
  const words = line.split(" ")
  for (let cut = 1; cut < words.length; cut += 1) {
    const left = words.slice(0, cut).join(" ")
    const right = words.slice(cut).join(" ")
    if (
      segments.has(nameKey(left)) &&
      segments.has(nameKey(right)) &&
      cellShaped(left) &&
      cellShaped(right)
    ) {
      return [left, right]
    }
  }
  return null
}

type Pending = { readonly page: number; readonly lines: string[] }

type Item =
  | {
      readonly kind: "row"
      readonly page: number
      readonly drug: string
      readonly confused: string
    }
  | { readonly kind: "group"; readonly page: number; readonly lines: readonly string[] }

function units(lines: readonly string[]): readonly string[] {
  return lines.length === 1 ? (lines[0] ?? "").split(" ") : lines
}

function partitions(lines: readonly string[]): readonly (readonly [string, string][])[] {
  const pieces = units(lines)
  const glue = lines.length === 1 ? (parts: readonly string[]) => parts.join(" ") : joinLines
  const out: [string, string][][] = []
  const total = pieces.length
  if (total < 2 || total > MAX_GROUP_LINES + 6) {
    return out
  }
  for (let mask = 0; mask < 2 ** (total - 1); mask += 1) {
    const cells: string[] = []
    let current: string[] = [pieces[0] ?? ""]
    for (let index = 1; index < total; index += 1) {
      if ((mask >> (index - 1)) & 1) {
        cells.push(glue(current))
        current = []
      }
      current.push(pieces[index] ?? "")
    }
    cells.push(glue(current))
    if (cells.length % 2 !== 0 || !cells.every(cellShaped)) {
      continue
    }
    const rows: [string, string][] = []
    for (let index = 0; index < cells.length; index += 2) {
      rows.push([cells[index] ?? "", cells[index + 1] ?? ""])
    }
    out.push(rows)
  }
  return out
}

function pairKey(drug: string, confused: string): string {
  return `${nameKey(drug)}|${nameKey(confused)}`
}

function itemsOf(raw: string, segments: ReadonlySet<string>): readonly Item[] {
  const items: Item[] = []
  let page = 0
  let collecting = false
  let pending: Pending | null = null
  const flush = (): void => {
    if (pending !== null && pending.lines.length > 0) {
      items.push({ kind: "group", page: pending.page, lines: [...pending.lines] })
    }
    pending = null
  }
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = cleanLine(rawLine)
    const pageMatch = PAGE.exec(line)
    if (pageMatch !== null) {
      page = Number(pageMatch[1])
    }
    if (line === HEADER) {
      flush()
      collecting = true
      continue
    }
    if (STOPS.some((stop) => stop.test(line)) || pageMatch !== null) {
      flush()
      collecting = false
      continue
    }
    if (!collecting || line.length === 0) {
      continue
    }
    const split = splitBySegments(line, segments)
    if (split !== null) {
      flush()
      items.push({ kind: "row", page, drug: split[0], confused: split[1] })
      continue
    }
    if (pending === null) {
      pending = { page, lines: [] }
    }
    pending.lines.push(line)
  }
  flush()
  return items
}

export function parseIsmp(raw: string, layout: string): IsmpParse {
  const items = itemsOf(raw, layoutSegments(layout))
  const firm = new Set(
    items.flatMap((item) => (item.kind === "row" ? [pairKey(item.drug, item.confused)] : [])),
  )
  const options = new Map<number, readonly (readonly [string, string][])[]>()
  const candidates = new Map<string, number>()
  items.forEach((item, index) => {
    if (item.kind !== "group") {
      return
    }
    const found = partitions(item.lines)
    options.set(index, found)
    for (const rows of found) {
      for (const [drug, confused] of rows) {
        const key = pairKey(drug, confused)
        candidates.set(key, (candidates.get(key) ?? 0) + 1)
      }
    }
  })
  const reverseKnown = (drug: string, confused: string): boolean => {
    const reverse = pairKey(confused, drug)
    return firm.has(reverse) || (candidates.get(reverse) ?? 0) > 0
  }

  const rows: IsmpRow[] = []
  const unresolved: { page: number; lines: readonly string[] }[] = []
  const perPage = new Map<number, number>()
  const push = (page: number, drug: string, confused: string): void => {
    const row = (perPage.get(page) ?? 0) + 1
    perPage.set(page, row)
    rows.push({ page, row, drug, confused })
  }
  items.forEach((item, index) => {
    if (item.kind === "row") {
      push(item.page, item.drug, item.confused)
      return
    }
    const scored = (options.get(index) ?? []).map((found) => ({
      found,
      score: found.filter(([drug, confused]) => reverseKnown(drug, confused)).length,
    }))
    const consistent = scored.filter(
      (entry) => entry.score > 0 && entry.score === entry.found.length,
    )
    const fewest = Math.min(...consistent.map((entry) => entry.found.length))
    const winners = consistent.filter((entry) => entry.found.length === fewest)
    const chosen = winners.length === 1 ? winners[0] : undefined
    if (chosen === undefined) {
      unresolved.push({ page: item.page, lines: item.lines })
      return
    }
    for (const [drug, confused] of chosen.found) {
      push(item.page, drug, confused)
    }
  })
  return { rows, unresolved }
}
