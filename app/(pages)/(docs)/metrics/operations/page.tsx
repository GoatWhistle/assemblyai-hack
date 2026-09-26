import type { Metadata } from "next"
import Link from "next/link"
import { BUSINESS_FIGURES } from "@/features/metrics/business-figures"
import { BusinessReading } from "@/features/metrics/business-reading"
import { CloseCodeTable } from "@/features/metrics/close-code-table"
import { closeCodeRows, closeCodeSetDescription } from "@/features/metrics/close-code-tally"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { OPERATIONS_SECTIONS } from "../../docs-map"

export const metadata: Metadata = {
  title: "Cost and operations",
  description:
    "What the gate would cost per order, why no figure is published yet, and the socket close codes counted from recorded sessions.",
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
        title="Business reading"
        lead="Derived only from measured figures that carry a command, so both readings wait on live runs."
      >
        <BusinessReading figures={BUSINESS_FIGURES} />
      </DocSection>

      <DocSection
        id={OPERATIONS_SECTIONS.closeCodes.id}
        title="Socket close codes"
        lead="Billing runs on socket lifetime rather than audio volume, so every recorded close is counted rather than asserted."
      >
        <CloseCodeTable rows={closeCodeRows()} setDescription={closeCodeSetDescription()} />
      </DocSection>
    </>
  )
}
