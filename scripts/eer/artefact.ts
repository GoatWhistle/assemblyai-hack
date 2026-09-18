import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { Scored } from "./score"

export type RecordedTiming = {
  readonly closeCode: number
  readonly openMs: number
  readonly finalizationMs: number | null
  readonly socketMs?: number
}

export type ArtefactFile = {
  readonly measuredAt?: string
  readonly setPath?: string
  readonly keyterms?: number
  readonly scored?: readonly Scored[]
  readonly results?: readonly RecordedTiming[]
  readonly outcomes?: readonly { readonly closeCode?: number; readonly socketMs?: number }[]
}

export type Artefact = {
  readonly path: string
  readonly present: boolean
  readonly measuredAt: string | null
  readonly keytermCount: number
  readonly scored: readonly Scored[]
  readonly results: readonly RecordedTiming[]
}

const ABSENT: Omit<Artefact, "path"> = {
  present: false,
  measuredAt: null,
  keytermCount: 0,
  scored: [],
  results: [],
}

export function readArtefact(...segments: readonly string[]): Artefact {
  const path = resolve(...segments)
  if (!existsSync(path)) {
    return { path, ...ABSENT }
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as ArtefactFile
  return {
    path,
    present: true,
    measuredAt: parsed.measuredAt ?? null,
    keytermCount: parsed.keyterms ?? 0,
    scored: parsed.scored ?? [],
    results: parsed.results ?? [],
  }
}

export function readScoredAcross(
  setPaths: readonly string[],
  fileName = "result-plain.json",
): readonly Scored[] {
  const all: Scored[] = []
  for (const setPath of setPaths) {
    all.push(...readArtefact(setPath, fileName).scored)
  }
  return all
}

export function cleanTimingsAcross(paths: readonly string[]): readonly RecordedTiming[] {
  const out: RecordedTiming[] = []
  for (const path of paths) {
    for (const entry of readArtefact(path).results) {
      if (entry.closeCode === 1000) {
        out.push(entry)
      }
    }
  }
  return out
}
