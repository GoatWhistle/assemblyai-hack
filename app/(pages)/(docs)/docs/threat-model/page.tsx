import type { Metadata } from "next"
import Link from "next/link"
import { WITNESS_BOUNDARY_NOTE } from "@/domain"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { THREAT_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = {
  title: "Threat model and receipts",
  description:
    "What the browser supplies, what the vendor's own transcript witnesses at finalize, what neither can prove, and how a sealed receipt is rechecked in the browser.",
}

const VERDICTS = [
  {
    verdict: "witnessed",
    meaning:
      "The vendor's transcript of the caller supports the value, by the same spoken-support rule the gate uses.",
  },
  {
    verdict: "not_witnessed",
    meaning:
      "The vendor's transcript was fetched and does not support the value. The receipt says so beside the field.",
  },
  {
    verdict: "unavailable",
    meaning:
      "The timeline could not be fetched, so nothing is claimed either way, and the receipt names the reason.",
  },
] as const

function sentence(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

export default function ThreatModelPage() {
  return (
    <>
      <DocHeader
        trail={<Link href="/docs">Docs</Link>}
        title="Threat model and receipts"
        lede="Can the browser simply lie about what was said? Against a hostile client, yes, and this page says how far that goes, what the vendor's own record adds, and what still cannot be proved."
      />

      <DocSection
        id={THREAT_SECTIONS.browser.id}
        title="The browser supplies the provenance, so a hostile client can forge it"
        lead="The browser holds the recognizer socket directly, so the words, their millisecond timings and their per-word certainties never pass through our server. The client posts them, and the gate checks that a value traces to words the session reported, not that anyone spoke them."
      >
        <ul className={styles.claims}>
          <li>
            <strong>What it stops:</strong> a recognizer quietly mishearing a drug name, which
            is the failure the product exists for.
          </li>
          <li>
            <strong>What it does not stop:</strong> a caller with DevTools posting invented
            words. Forging your own transcript deceives only yourself, and the gate is not built
            against that adversary.
          </li>
          <li>
            <strong>Why not relay the audio:</strong> it needs an always-on host, the process
            this design removed to fit the platform. The trade: we hold finer-grained evidence,
            per word, that a hostile client could fabricate; a relaying design holds
            coarser-grained evidence that a hostile client could not.
          </li>
        </ul>
        <p className={styles.more}>
          <Link href="/docs/limitations#limit-provenance">The limitation at full strength</Link>
        </p>
      </DocSection>

      <DocSection
        id={THREAT_SECTIONS.witness.id}
        title="The vendor witness is a second channel the browser cannot write"
        lead="At finalize the server fetches, with its own key, the transcript AssemblyAI's own recognizer produced on the agent socket, and seals one verdict per field into the receipt. Forging provenance now means forging the vendor's record too."
      >
        <dl className={styles.verdicts}>
          {VERDICTS.map((entry) => (
            <div key={entry.verdict} className={styles.verdict}>
              <dt>
                <code className={styles.code}>{entry.verdict}</code>
              </dt>
              <dd>{entry.meaning}</dd>
            </div>
          ))}
        </dl>
        <blockquote className={styles.boundary}>
          <p>{sentence(WITNESS_BOUNDARY_NOTE)}</p>
          <footer>WITNESS_BOUNDARY_NOTE, the sentence every sealed receipt carries</footer>
        </blockquote>
        <p className={styles.prose}>
          It also arrives too late to block anything: the timeline appears seconds after the
          session ends, so it seals a receipt rather than stopping a commit inside the call. It
          carries turn-level times, not word-level ones, so the word-to-gate latency stays a
          browser measurement.
        </p>
        <p className={styles.source}>
          <span className={styles.sourceLabel}>Source</span> the session list and each
          session&rsquo;s timeline artifact on AssemblyAI&rsquo;s agents API, read with the
          server&rsquo;s key; the delay was observed on 25 September 2026 with
          scripts/report/probe-witness.ts.
        </p>
      </DocSection>

      <DocSection
        id={THREAT_SECTIONS.receipt.id}
        title="A receipt is rechecked in your browser, not taken on our word"
        lead="Every committed live order links its receipt at /order/ followed by its session id. That page recomputes the sha256 over the receipt's canonical JSON, the NPI and DEA check digits, and whether a name on the published pair list was confirmed aloud, and shows the witness verdict beside each field."
      >
        <p className={styles.prose}>
          The same page checks a downloaded receipt file: change one character and the digest no
          longer matches. No sample receipt is published here, because none has come from a
          recorded live call, and a synthesised one would be a record presented as genuine.
        </p>
        <p className={styles.more}>
          <Link href="/order">Check a downloaded receipt file</Link>
        </p>
      </DocSection>
    </>
  )
}
