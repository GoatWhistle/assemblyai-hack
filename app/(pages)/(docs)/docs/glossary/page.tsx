import type { Metadata } from "next"
import { GLOSSARY, glossaryAnchor, ISMP_SOURCE } from "@/features/how-it-works/glossary/terms"
import { Code } from "@/shared/ui/data-display/code"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { TextLink } from "@/shared/ui/navigation/text-link"
import { pageMetadata } from "@/site/page-metadata"
import { GLOSSARY_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = pageMetadata({
  title: "Glossary",
  description:
    "The terms Readback's pages use, from LASA and NDC to keyterms and provenance, and the exact clauses behind read-back.",
  path: "/docs/glossary",
})

const TERM_COLUMNS: readonly TableColumn[] = [
  { key: "term", title: "Term", rowHeader: true },
  { key: "definition", title: "Meaning", kind: "muted", stack: "bare" },
]

const CITATION_COLUMNS: readonly TableColumn[] = [
  { key: "source", title: "Source", rowHeader: true },
  { key: "says", title: "What it says, and why it is cited", kind: "muted", stack: "bare" },
]

const CITATIONS = [
  {
    key: "icao",
    source: <>ICAO Annex 11, &sect;3.7.3.1 and &sect;3.7.3.1.2</>,
    says: "The flight crew reads back safety-related parts of clearances transmitted by voice, and the controller corrects any discrepancy the read-back reveals. Cited because medicine’s read-back requirement is documented as borrowed from aviation.",
  },
  {
    key: "joint-commission",
    source: "Joint Commission NPSG.02.01.01, a National Patient Safety Goal since 2003",
    says: "The receiver of a verbal or telephone order, or of a critical test result, reads the complete order back. ISMP placed it at PC.02.01.03 EP 20 in 2017; its 2026 location is not verified by us.",
  },
  {
    key: "cfr",
    source: "21 CFR 1306.12(a)",
    says: "A Schedule II prescription may not be refilled, which the gate enforces as a validator refusal.",
  },
  {
    key: "ismp",
    source: <TextLink href={ISMP_SOURCE.url}>{ISMP_SOURCE.title}</TextLink>,
    says: (
      <>
        The published PDF the pair rule is parsed from, with the page and row of every pair
        kept. Its sha256 as parsed: <Code breakable>{ISMP_SOURCE.sha256}</Code>
      </>
    ),
  },
] as const

export default function GlossaryPage() {
  return (
    <>
      <DocHeader
        title="Glossary"
        lede="Pharmacy, speech-recognition and measurement terms, each defined once, in the sense these pages use them."
      />

      <DocSection
        id={GLOSSARY_SECTIONS.terms.id}
        title="Terms, in the order a reader meets them"
      >
        <Table
          label="Terms"
          columns={TERM_COLUMNS}
          rows={GLOSSARY.map((entry) => ({
            key: entry.term,
            id: glossaryAnchor(entry.term),
            cells: {
              term: (
                <>
                  {entry.term}
                  {entry.expansion === null ? null : (
                    <span className={styles.expansion}> ({entry.expansion})</span>
                  )}
                </>
              ),
              definition: entry.definition,
            },
          }))}
        />
      </DocSection>

      <DocSection
        id={GLOSSARY_SECTIONS.citations.id}
        title="Read-back is already required; these are the clauses"
        lead="Each is cited by clause. None of them governs this software, and this project is not affiliated with, endorsed by or reviewed by any of the bodies named."
      >
        <Table
          label="The clauses behind read-back"
          columns={CITATION_COLUMNS}
          rows={CITATIONS.map((citation) => ({
            key: citation.key,
            cells: { source: citation.source, says: citation.says },
          }))}
        />
        <p className={styles.note}>
          No penalty or sanction figure is published for any of these, because none has been
          checked against a primary source.
        </p>
      </DocSection>
    </>
  )
}
