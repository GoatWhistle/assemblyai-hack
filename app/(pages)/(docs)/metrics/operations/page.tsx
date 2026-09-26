import type { Metadata } from "next"
import Link from "next/link"
import {
  COMBINED_PER_HOUR_USD,
  COMBINED_PER_MINUTE_USD,
  PUBLISHED_RATES,
  RATE_CHECKED_ON,
  RATE_SOURCE_URL,
} from "@/features/cost/published-rate"
import { BUSINESS_FIGURES } from "@/features/metrics/business-figures"
import { BusinessReading } from "@/features/metrics/business-reading"
import { CloseCodeTable } from "@/features/metrics/close-code-table"
import {
  alertWorthyList,
  closeCodeRows,
  closeCodeSetDescription,
  OBSERVATION_SOURCES,
  VENDOR_DOCUMENTS_NONE,
} from "@/features/metrics/close-code-tally"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { OPERATIONS_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = {
  title: "Cost and operations",
  description:
    "What the gate would cost per order, why no figure is published yet, and the socket close codes counted from recorded sessions, each labelled as an observation.",
}

export default function OperationsPage() {
  return (
    <>
      <DocHeader
        trail={<Link href="/metrics">Measurements</Link>}
        title="Cost and operations"
        lede="What the gate costs a pharmacist and an order, and how the sockets closed. Every reading here is derived only from figures that carry a command."
      />

      <DocSection
        id={OPERATIONS_SECTIONS.business.id}
        title="What the gate costs an order: not measured yet"
        lead="Derived only from measured figures that carry a command, so both readings wait on live runs."
      >
        <BusinessReading figures={BUSINESS_FIGURES} />
      </DocSection>

      <DocSection
        id={OPERATIONS_SECTIONS.rates.id}
        title="What an open call costs by the vendor's published rates"
        lead={`Rates, not measurements: AssemblyAI bills on socket lifetime, and both sockets are open for the whole call. Read from the pricing page on ${RATE_CHECKED_ON}.`}
      >
        <dl className={styles.list}>
          {PUBLISHED_RATES.map((rate) => (
            <div key={rate.product} className={styles.rate}>
              <dt className={styles.product}>{rate.product}</dt>
              <dd className={styles.code}>USD {rate.perHourUsd.toFixed(2)} per hour</dd>
              <dd className={styles.source}>{rate.why}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>
          Together USD {COMBINED_PER_HOUR_USD.toFixed(2)} per hour, about USD{" "}
          {COMBINED_PER_MINUTE_USD.toFixed(3)} per minute of an open call: arithmetic over the
          rate table, not an invoice. The total actually spent is derived from the run ledger by{" "}
          <code className={styles.code}>make spend</code>. Source:{" "}
          <a href={RATE_SOURCE_URL} rel="noreferrer">
            {RATE_SOURCE_URL}
          </a>
        </p>
      </DocSection>

      <DocSection
        id={OPERATIONS_SECTIONS.closeCodes.id}
        title="How the sockets closed: observations, not specification"
        lead={VENDOR_DOCUMENTS_NONE}
      >
        <CloseCodeTable
          rows={closeCodeRows()}
          setDescription={closeCodeSetDescription()}
          alertWorthy={alertWorthyList()}
        />
        <div className={styles.sources}>
          <p className={styles.sourcesTitle}>
            Every code we hold an observation for, and whose
          </p>
          <dl className={styles.list}>
            {OBSERVATION_SOURCES.map(([code, source]) => (
              <div key={code} className={styles.row}>
                <dt className={styles.code}>{code}</dt>
                <dd className={styles.source}>{source}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>
            Billing runs on socket lifetime rather than audio volume, so a close is counted from
            the recorded files rather than asserted. None of these codes may be read as the
            vendor&rsquo;s specification.
          </p>
        </div>
      </DocSection>
    </>
  )
}
