import type { Metadata } from "next"
import { GLOSSARY, glossaryAnchor, ISMP_SOURCE } from "@/features/how-it-works/glossary/terms"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { ExternalLink } from "@/shared/ui/navigation/external-link"
import { pageMetadata } from "@/site/page-metadata"
import { GLOSSARY_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = pageMetadata({
  title: "Glossary",
  description:
    "The terms Readback's pages use, from LASA and NDC to keyterms and provenance, and the exact clauses behind read-back.",
  path: "/docs/glossary",
})

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
        <div className={styles.frame}>
          <dl className={styles.terms}>
            {GLOSSARY.map((entry) => (
              <div key={entry.term} className={styles.entry} id={glossaryAnchor(entry.term)}>
                <dt className={styles.term}>
                  {entry.term}
                  {entry.expansion === null ? null : (
                    <span className={styles.expansion}> ({entry.expansion})</span>
                  )}
                </dt>
                <dd className={styles.definition}>{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      </DocSection>

      <DocSection
        id={GLOSSARY_SECTIONS.citations.id}
        title="Read-back is already required; these are the clauses"
        lead="Each is cited by clause. None of them governs this software, and this project is not affiliated with, endorsed by or reviewed by any of the bodies named."
      >
        <div className={styles.shelf}>
          <ul className={styles.citations}>
            <li>
              <strong>ICAO Annex 11, &sect;3.7.3.1 and &sect;3.7.3.1.2.</strong> The flight crew
              reads back safety-related parts of clearances transmitted by voice, and the
              controller corrects any discrepancy the read-back reveals. Cited because
              medicine&rsquo;s read-back requirement is documented as borrowed from aviation.
            </li>
            <li>
              <strong>
                Joint Commission NPSG.02.01.01, a National Patient Safety Goal since 2003.
              </strong>{" "}
              The receiver of a verbal or telephone order, or of a critical test result, reads
              the complete order back. ISMP placed it at PC.02.01.03 EP 20 in 2017; its 2026
              location is not verified by us.
            </li>
            <li>
              <strong>21 CFR 1306.12(a).</strong> A Schedule II prescription may not be
              refilled, which the gate enforces as a validator refusal.
            </li>
            <li>
              <strong>
                <ExternalLink href={ISMP_SOURCE.url}>{ISMP_SOURCE.title}</ExternalLink>.
              </strong>{" "}
              The published PDF the pair rule is parsed from, with the page and row of every
              pair kept. Its sha256 as parsed:{" "}
              <code className={styles.digest}>{ISMP_SOURCE.sha256}</code>
            </li>
          </ul>
        </div>
        <p className={styles.note}>
          No penalty or sanction figure is published for any of these, because none has been
          checked against a primary source.
        </p>
      </DocSection>
    </>
  )
}
