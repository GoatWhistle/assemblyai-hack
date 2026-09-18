export type CatalogFact = {
  readonly heard: string
  readonly resolvesTo: string | null
  readonly deaSchedule: string | null
  readonly skeleton: string | null
  readonly skeletonNeighbours: readonly string[]
}

export const MORPHINE: CatalogFact = Object.freeze({
  heard: "morphine sulfate",
  resolvesTo: "morphine sulfate",
  deaSchedule: "CII",
  skeleton: null,
  skeletonNeighbours: Object.freeze([]),
})

export const VENORELBINE: CatalogFact = Object.freeze({
  heard: "venorelbine",
  resolvesTo: null,
  deaSchedule: null,
  skeleton: "vnrlbn",
  skeletonNeighbours: Object.freeze(["vinorelbine"]),
})

export const CATALOG_FACTS: readonly CatalogFact[] = Object.freeze([MORPHINE, VENORELBINE])

export const REFILLS_HEARD = 5
