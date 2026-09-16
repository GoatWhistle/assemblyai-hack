import { LasaSource } from "@/domain"

export type LasaPair = {
  readonly termA: string
  readonly termB: string
  readonly source: LasaSource
  readonly sourceRow: string
}

export const LASA_PAIRS: readonly LasaPair[] = [
  {
    termA: "lisinopril",
    termB: "bisoprolol",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: lisinopril - bisoprolol",
  },
  {
    termA: "hydralazine",
    termB: "hydroxyzine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: hydralazine - hydroxyzine",
  },
  {
    termA: "clonidine",
    termB: "klonopin",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: clonidine - Klonopin",
  },
  {
    termA: "metformin",
    termB: "metronidazole",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: metformin - metronidazole",
  },
  {
    termA: "tramadol",
    termB: "trazodone",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: tramadol - trazodone",
  },
  {
    termA: "vinblastine",
    termB: "vincristine",
    source: LasaSource.FdaNameDiff,
    sourceRow: "FDA Name Differentiation Project tall-man pair: vinBLAStine - vinCRIStine",
  },
  {
    termA: "cycloserine",
    termB: "cyclosporine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: cycloSERINE - cycloSPORINE",
  },
  {
    termA: "chlorpromazine",
    termB: "chlorpropamide",
    source: LasaSource.FdaNameDiff,
    sourceRow:
      "FDA Name Differentiation Project tall-man pair: chlorproMAZINE - chlorproPAMIDE",
  },
  {
    termA: "glipizide",
    termB: "glyburide",
    source: LasaSource.FdaNameDiff,
    sourceRow: "FDA Name Differentiation Project tall-man pair: glipiZIDE - glyBURIDE",
  },
  {
    termA: "sulfadiazine",
    termB: "sulfasalazine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: sulfADIAZINE - sulfaSALAzine",
  },
  {
    termA: "hydromorphone",
    termB: "morphine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: HYDROmorphone - morphine",
  },
  {
    termA: "oxycodone",
    termB: "oxycontin",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: oxycodone - OxyCONTIN",
  },
  {
    termA: "prednisone",
    termB: "prednisolone",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: predniSONE - prednisoLONE",
  },
  {
    termA: "clobazam",
    termB: "clonazepam",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: clobazam - clonazepam",
  },
  {
    termA: "lamotrigine",
    termB: "lamivudine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: lamoTRIgine - lamiVUDine",
  },
  {
    termA: "carboplatin",
    termB: "cisplatin",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: CARBOplatin - CISplatin",
  },
  {
    termA: "azathioprine",
    termB: "azithromycin",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: azaTHIOprine - azithromycin",
  },
  {
    termA: "dobutamine",
    termB: "dopamine",
    source: LasaSource.FdaNameDiff,
    sourceRow: "FDA Name Differentiation Project tall-man pair: DOBUTamine - DOPamine",
  },
  {
    termA: "nifedipine",
    termB: "nimodipine",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: niFEDipine - niMODipine",
  },
  {
    termA: "cefazolin",
    termB: "cefotaxime",
    source: LasaSource.Ismp2023,
    sourceRow: "ISMP List of Confused Drug Names, February 2023: ceFAZolin - cefOTAXime",
  },
]
