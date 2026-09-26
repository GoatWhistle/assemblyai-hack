import snapshot from "../../../../data/lasa-pairs.json"

export type GlossaryTerm = {
  readonly term: string
  readonly expansion: string | null
  readonly definition: string
}

export function glossaryAnchor(term: string): string {
  return `term-${term.toLowerCase().replace(/\s+/g, "-")}`
}

export function glossaryHref(term: string): string {
  return `/docs/glossary#${glossaryAnchor(term)}`
}

export const GLOSSARY: readonly GlossaryTerm[] = Object.freeze([
  {
    term: "LASA",
    expansion: "look-alike, sound-alike",
    definition:
      "Two drug names that are easy to confuse by sight or by ear, such as hydromorphone and morphine.",
  },
  {
    term: "ISMP",
    expansion: "Institute for Safe Medication Practices",
    definition:
      "Publishes the List of Confused Drug Names. Its 2023 edition is the list the pair rule reads, every pair of it.",
  },
  {
    term: "Pair rule",
    expansion: null,
    definition:
      "A heard drug name on the ISMP list is asked about again even at full certainty, by naming it and its listed partners. Only a spoken name answers that question, never a yes.",
  },
  {
    term: "Certainty",
    expansion: "the recognizer's reported confidence",
    definition:
      "How sure the speech recognizer says it is about the words it returned. It describes the acoustics, so it cannot tell two similar names apart; the reason code E_LOW_CONFIDENCE keeps the recognizer's own word.",
  },
  {
    term: "Threshold",
    expansion: null,
    definition:
      "The certainty below which a field is asked again. A chosen default per field, not tuned on any set.",
  },
  {
    term: "Standing read-back",
    expansion: "E_READ_BACK_REQUIRED",
    definition:
      "Drug name, strength, quantity, directions and patient name are always read back once, whatever else happens. The pair rule changes that question into a contrastive one.",
  },
  {
    term: "Gate",
    expansion: null,
    definition:
      "The single decision function a value passes before it can enter the order. It owns the only constructor of a confirmed value.",
  },
  {
    term: "Validator",
    expansion: null,
    definition:
      "A pure check on a value: a checksum for NPI and DEA, existence in the built catalogue for a drug, and consistency for a combination.",
  },
  {
    term: "Reason code",
    expansion: null,
    definition:
      "The gate's machine-readable reason for a decision, such as E_LASA_HIT. A_ marks an acceptance, C_ a caller's confirmation that settled a value, and E_ a question asked again or a refusal.",
  },
  {
    term: "NDC",
    expansion: "National Drug Code",
    definition:
      "The FDA's directory of drug products. It has no check digit, so a drug name is proved by existing in the catalogue built from it, never by arithmetic.",
  },
  {
    term: "NPI",
    expansion: "National Provider Identifier",
    definition: "The prescriber's ten-digit national identifier, checked by a Luhn checksum.",
  },
  {
    term: "DEA number",
    expansion: "Drug Enforcement Administration registration",
    definition:
      "The prescriber's controlled-substance registration, checked by its own mod-10 rule, which is weaker than the NPI's.",
  },
  {
    term: "Sig",
    expansion: "the directions",
    definition:
      "How the patient takes the drug, for example one tablet by mouth twice a day. Checked against the ISMP error-prone abbreviation list.",
  },
  {
    term: "Keyterms",
    expansion: null,
    definition:
      "Words the recognizer is told to expect. A drug name the pair rule checks never goes in, or the recognizer would confirm our own hint.",
  },
  {
    term: "Provenance",
    expansion: null,
    definition:
      "For every value, the spoken words that produced it, their timecodes in milliseconds, the certainty over those words and the validator's verdict.",
  },
  {
    term: "STT and TTS",
    expansion: "speech-to-text and text-to-speech",
    definition:
      "The recognizer socket, and the synthetic voices the evaluation corpora were recorded with.",
  },
  {
    term: "Entity error rate",
    expansion: null,
    definition: "How often the recognizer returned a different drug name than the one spoken.",
  },
  {
    term: "Wilson interval",
    expansion: null,
    definition:
      "The bracketed range after a rate, such as [17.1%, 39.0%]: a 95% confidence interval that stays honest on small sets.",
  },
])

export const ISMP_SOURCE = Object.freeze({
  title: snapshot.source,
  url: snapshot.sourceUrl,
  sha256: snapshot.sourcePdfSha256,
})
