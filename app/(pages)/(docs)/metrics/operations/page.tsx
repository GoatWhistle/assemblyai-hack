import type { Metadata } from "next"
import {
  COMBINED_PER_HOUR_USD,
  COMBINED_PER_MINUTE_USD,
  PUBLISHED_RATES,
  RATE_SOURCE_URL,
} from "@/features/cost/published-rate"
import { BUSINESS_FIGURES } from "@/features/metrics/business-figures"
import { BusinessReading } from "@/features/metrics/business-reading"
import { CloseCodeTable } from "@/features/metrics/close-code-table"
import {
  alertWorthyList,
  closeCodeRows,
  closeCodeScope,
  unobservedCodeRows,
  VENDOR_DOCUMENTS_NONE,
} from "@/features/metrics/close-code-tally"
import { type PanelColumn, PanelTable } from "@/features/metrics/panel-table"
import { Command } from "@/shared/ui/data-display/command"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { TextLink } from "@/shared/ui/navigation/text-link"
import { pageMetadata } from "@/site/page-metadata"
import { OPERATIONS_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = pageMetadata({
  title: "Cost and operations",
  description:
    "What an open call costs by the vendor's published rates, why no per-order figure is published yet, and the socket close codes counted from recorded sessions, each labelled as an observation.",
  path: "/metrics/operations",
})

const RATE_COLUMNS: readonly PanelColumn[] = [
  { key: "product", title: "Product", kind: "text" },
  { key: "why", title: "What it covers", kind: "muted" },
  { key: "rate", title: "Rate", kind: "count" },
]

export default function OperationsPage() {
  return (
    <>
      <DocHeader
        title="Cost and operations"
        lede="What an open call costs by the vendor's rates, what the gate would cost an order, and how the sockets closed. Every reading here is derived only from figures that carry a command."
      />

      <DocSection
        id={OPERATIONS_SECTIONS.rates.id}
        title="What an open call costs by the vendor's published rates"
        lead={`Rates, not measurements: AssemblyAI bills on socket lifetime, and both sockets are open for the whole call. Read from the vendor's pricing page.`}
      >
        <PanelTable
          label="Published rates"
          caption={
            <>
              Together USD {COMBINED_PER_HOUR_USD.toFixed(2)} per hour, about USD{" "}
              {COMBINED_PER_MINUTE_USD.toFixed(3)} per minute of an open call: arithmetic over
              the rate table, not an invoice. Source:{" "}
              <TextLink href={RATE_SOURCE_URL}>{RATE_SOURCE_URL}</TextLink>
            </>
          }
          columns={RATE_COLUMNS}
          rows={PUBLISHED_RATES.map((rate) => ({
            key: rate.product,
            cells: {
              product: rate.product,
              why: rate.why,
              rate: `USD ${rate.perHourUsd.toFixed(2)} per hour`,
            },
          }))}
        />
        <p className={styles.note}>
          The total actually spent is derived from the run ledger by{" "}
          <Command value="make spend" />, never from this table.
        </p>
      </DocSection>

      <DocSection
        id={OPERATIONS_SECTIONS.business.id}
        title="What the gate costs an order: not measured yet"
        lead="Derived only from measured figures that carry a command, so both readings wait on live runs."
      >
        <BusinessReading figures={BUSINESS_FIGURES} />
      </DocSection>

      <DocSection
        id={OPERATIONS_SECTIONS.closeCodes.id}
        title="How the sockets closed: observations, not specification"
        lead={VENDOR_DOCUMENTS_NONE}
      >
        <CloseCodeTable
          rows={closeCodeRows()}
          unobserved={unobservedCodeRows()}
          scope={closeCodeScope()}
          alertWorthy={alertWorthyList()}
        />
        <p className={styles.note}>
          Billing runs on socket lifetime rather than audio volume, so a close is counted from
          the recorded files rather than asserted. None of these codes may be read as the
          vendor&rsquo;s specification.
        </p>
      </DocSection>
    </>
  )
}
