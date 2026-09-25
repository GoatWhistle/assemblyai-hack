import { LasaSource } from "@/domain"

export type LasaPair = {
  readonly termA: string
  readonly termB: string
  readonly source: LasaSource
  readonly sourceRow: string
}

export const ISMP_2023_ROW_PREFIX =
  "ISMP List of Confused Drug Names, updated through February 2023: "

export const LASA_PAIRS: readonly LasaPair[] = [
  {
    termA: "hydromorphone",
    termB: "morphine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}HYDROmorphone - morphine`,
  },
  {
    termA: "hydralazine",
    termB: "hydroxyzine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}hydrOXYzine - hydrALAZINE`,
  },
  {
    termA: "clonidine",
    termB: "clozapine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}cloNIDine - cloZAPine`,
  },
  {
    termA: "metformin",
    termB: "metronidazole",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}metroNIDAZOLE - metFORMIN`,
  },
  {
    termA: "tramadol",
    termB: "trazodone",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}traMADol - traZODone`,
  },
  {
    termA: "diazepam",
    termB: "diltiazem",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}diazePAM - dilTIAZem`,
  },
  {
    termA: "cycloserine",
    termB: "cyclosporine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}cycloSERINE - cycloSPORINE`,
  },
  {
    termA: "dexamethasone",
    termB: "dexmedetomidine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}dexAMETHasone - dexmedeTOMIDine`,
  },
  {
    termA: "glipizide",
    termB: "glyburide",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}glyBURIDE - glipiZIDE`,
  },
  {
    termA: "amiloride",
    termB: "amlodipine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}aMILoride - amLODIPine`,
  },
  {
    termA: "oxycodone",
    termB: "oxycontin",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}oxyCODONE - OxyCONTIN`,
  },
  {
    termA: "rifampin",
    termB: "rifaximin",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}rifAMPin - rifAXIMin`,
  },
  {
    termA: "clobazam",
    termB: "clonazepam",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}cloBAZam - clonazePAM`,
  },
  {
    termA: "lamotrigine",
    termB: "lamivudine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}lamoTRIgine - lamiVUDine`,
  },
  {
    termA: "guaifenesin",
    termB: "guanfacine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}guaiFENesin - guanFACINE`,
  },
  {
    termA: "bupropion",
    termB: "buspirone",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}buPROPion - busPIRone`,
  },
  {
    termA: "dobutamine",
    termB: "dopamine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}DOBUTamine - DOPamine`,
  },
  {
    termA: "nifedipine",
    termB: "nimodipine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}NIFEdipine - niMODipine`,
  },
  {
    termA: "cefazolin",
    termB: "cefotetan",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}ceFAZolin - cefoTEtan`,
  },
  {
    termA: "levothyroxine",
    termB: "liothyronine",
    source: LasaSource.Ismp2023,
    sourceRow: `${ISMP_2023_ROW_PREFIX}levothyroxine - liothyronine`,
  },
]
