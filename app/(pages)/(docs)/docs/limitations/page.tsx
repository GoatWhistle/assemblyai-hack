import type { Metadata } from "next"
import Link from "next/link"
import { LIMITATIONS, Limits, limitationsIn } from "@/features/how-it-works/limits"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { LIMITATIONS_SECTIONS } from "../../docs-map"

export const metadata: Metadata = {
  title: "Limitations",
  description:
    "Everything Readback cannot prove, each entry with its status: measured, enforced by a check, assumed, or false and admitted.",
}

export default function LimitationsPage() {
  return (
    <>
      <DocHeader
        trail={<Link href="/docs">Docs</Link>}
        title="Limitations"
        lede={`All ${LIMITATIONS.length} things this project cannot prove, stated before a reader finds them. Each carries its status: what is measured, what a machine check enforces, what is assumed, and what is false and admitted. The complete account, with the tests that pin each one, is docs/limitations.md in the repository.`}
      />

      <DocSection
        id={LIMITATIONS_SECTIONS.trust.id}
        title="The trust boundary sits in the browser"
        lead="Who can make the gate accept a value it should not, and what we did and did not do about it."
      >
        <Limits entries={limitationsIn("trust")} />
      </DocSection>

      <DocSection
        id={LIMITATIONS_SECTIONS.evidence.id}
        title="The evidence is synthetic, and one hypothesis failed"
        lead="Where the published figures stop generalising, and what was deliberately left unmeasured."
      >
        <Limits entries={limitationsIn("evidence")} />
      </DocSection>

      <DocSection
        id={LIMITATIONS_SECTIONS.operations.id}
        title="Running it is not clinical use"
        lead="What the sockets tell us, where the audio goes, and what a caller must never rely on this for."
      >
        <Limits entries={limitationsIn("operations")} />
      </DocSection>
    </>
  )
}
