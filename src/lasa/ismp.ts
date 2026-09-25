import { LasaSource } from "@/domain"
import snapshot from "../../data/lasa-pairs.json"
import { ISMP_2023_ROW_PREFIX, type LasaPair } from "./pairs"

export type IsmpPairRecord = {
  readonly termA: string
  readonly termB: string
  readonly listedA: string
  readonly listedB: string
  readonly page: number
  readonly row: number
}

export const ISMP_PAIR_RECORDS: readonly IsmpPairRecord[] = Object.freeze(
  snapshot.pairs.map((pair) => Object.freeze({ ...pair })),
)

export const ISMP_PAIRS: readonly LasaPair[] = Object.freeze(
  ISMP_PAIR_RECORDS.map((pair) =>
    Object.freeze({
      termA: pair.termA,
      termB: pair.termB,
      source: LasaSource.Ismp2023,
      sourceRow: `${ISMP_2023_ROW_PREFIX}${pair.listedA} - ${pair.listedB} (page ${pair.page}, row ${pair.row})`,
    }),
  ),
)
