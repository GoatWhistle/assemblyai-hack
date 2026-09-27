import type { Metadata } from "next"
import { WITNESS_BOUNDARY_NOTE } from "@/domain"
import { Code } from "@/shared/ui/data-display/code"
import { Method } from "@/shared/ui/data-display/method"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Panel } from "@/shared/ui/primitives/panel"
import { pageMetadata } from "@/site/page-metadata"
import { THREAT_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = pageMetadata({
  title: "Threat model and receipts",
  description:
    "What the browser supplies, what the vendor's own transcript witnesses at finalize, what neither can prove, and how a sealed receipt is rechecked in the browser.",
  path: "/docs/threat-model",
})

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

const CLAIMS = [
  {
    key: "stops",
    aspect: "What it stops",
    answer:
      "A recognizer quietly mishearing a drug name, which is the failure the product exists for.",
  },
  {
    key: "does-not-stop",
    aspect: "What it does not stop",
    answer:
      "A caller with DevTools posting invented words. Forging your own transcript deceives only yourself, and the gate is not built against that adversary.",
  },
  {
    key: "relay",
    aspect: "Why not relay the audio",
    answer:
      "It needs an always-on host, the process this design removed to fit the platform. The trade: we hold finer-grained evidence, per word, that a hostile client could fabricate; a relaying design holds coarser-grained evidence that a hostile client could not.",
  },
] as const

const CLAIM_COLUMNS: readonly TableColumn[] = [
  { key: "aspect", title: "Question", rowHeader: true },
  { key: "answer", title: "Answer", kind: "muted", stack: "bare" },
]

const VERDICT_COLUMNS: readonly TableColumn[] = [
  { key: "verdict", title: "Verdict", rowHeader: true },
  { key: "meaning", title: "What it means", kind: "muted", stack: "bare" },
]

const WITNESS_PROBE = "npx tsx scripts/report/probe-witness.ts"

function sentence(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

export default function ThreatModelPage() {
  return (
    <>
      <DocHeader
        title="Threat model and receipts"
        lede="Can the browser simply lie about what was said? Against a hostile client, yes, and this page says how far that goes, what the vendor's own record adds, and what still cannot be proved."
      />

      <DocSection
        id={THREAT_SECTIONS.browser.id}
        title="The browser supplies the provenance, so a hostile client can forge it"
        lead="The browser holds the recognizer socket directly, so the words, their millisecond timings and their per-word certainties never pass through our server. The client posts them, and the gate checks that a value traces to words the session reported, not that anyone spoke them."
      >
        <Table
          label="What browser-supplied provenance stops, and what it does not"
          columns={CLAIM_COLUMNS}
          rows={CLAIMS.map((claim) => ({
            key: claim.key,
            cells: { aspect: claim.aspect, answer: claim.answer },
          }))}
        />
        <p className={styles.more}>
          <MoreLink href="/docs/limitations#limit-provenance">
            The limitation at full strength
          </MoreLink>
        </p>
      </DocSection>

      <DocSection
        id={THREAT_SECTIONS.witness.id}
        title="The vendor witness is a second channel the browser cannot write"
        lead="At finalize the server fetches the caller transcript AssemblyAI's own recognizer produced on the agent socket and seals one verdict per field into the receipt, so forging provenance means forging the vendor's record too."
      >
        <Table
          label="The three witness verdicts"
          columns={VERDICT_COLUMNS}
          rows={VERDICTS.map((entry) => ({
            key: entry.verdict,
            cells: { verdict: <Code>{entry.verdict}</Code>, meaning: entry.meaning },
          }))}
        />
        <div className={styles.frame}>
          <div className={styles.pair}>
            <Panel as="aside" tone="tinted">
              <blockquote className={styles.boundary}>
                <p>{sentence(WITNESS_BOUNDARY_NOTE)}</p>
                <footer>
                  <Code>WITNESS_BOUNDARY_NOTE</Code>, the sentence every sealed receipt carries
                </footer>
              </blockquote>
            </Panel>
            <div className={styles.aside}>
              <p className={styles.prose}>
                It also arrives too late to block anything: the timeline appears seconds after
                the session ends, so it seals a receipt rather than stopping a commit inside the
                call. It carries turn-level times, not word-level ones, so the word-to-gate
                latency stays a browser measurement.
              </p>
              <p className={styles.source}>
                <Method
                  command={WITNESS_PROBE}
                  set="measures the delay over the session list and each session's timeline artifact on AssemblyAI's agents API, read with the server's key"
                />
              </p>
            </div>
          </div>
        </div>
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
        <div>
          <ActionLink href="/order" icon="forward">
            Check a downloaded receipt file
          </ActionLink>
        </div>
      </DocSection>
    </>
  )
}
