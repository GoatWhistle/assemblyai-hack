import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { CatalogUnavailableError } from "@/domain"
import type { ComboQuery, ComboSource } from "@/validators"
import { comboExists, combosFor } from "./query"
import { buildIndex, type CatalogIndex, isCatalogFile } from "./store"
import type { CatalogFile } from "./types"

const CATALOG_PATH = "data/catalog.json"

let cached: CatalogIndex | null = null

export function loadCatalogFrom(path: string): CatalogIndex {
  let raw: string
  try {
    raw = readFileSync(resolve(path), "utf8")
  } catch {
    throw new CatalogUnavailableError(
      `${path} could not be read; run make data to build the NDC catalogue`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CatalogUnavailableError(`${path} is not valid JSON; rebuild it with make data`)
  }

  if (!isCatalogFile(parsed)) {
    throw new CatalogUnavailableError(`${path} has no drugs array; rebuild it with make data`)
  }

  return buildIndex(parsed as CatalogFile)
}

export function loadCatalog(): CatalogIndex {
  if (cached === null) {
    cached = loadCatalogFrom(CATALOG_PATH)
  }
  return cached
}

export function catalogFromFile(file: CatalogFile): CatalogIndex {
  return buildIndex(file)
}

export function comboSourceFor(index: CatalogIndex): ComboSource {
  return {
    comboExists: (query: ComboQuery) => comboExists(index, query),
    combosFor: (drugName: string) => combosFor(index, drugName),
  }
}
