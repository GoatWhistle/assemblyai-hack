import type { Metadata } from "next"
import { COMPARE_CAPTION, COMPARE_TITLE, Compare, SOURCE_NOTE } from "@/features/compare"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { COMPARE_SECTIONS } from "../docs-map"

const COMPARE_HEADING = "What the gate changes, one moment at a time"

const COMPARE_LEDE =
  "Said, heard, the recognizer's own certainty, the gate's verdict with its reason code, and what a confidence threshold alone would have written. Where the two last columns disagree is where the gate earns its place."

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Six synthesised moments side by side: what was said, what the recognizer heard, its certainty, the gate's verdict and reason code, and what would have entered the order without the gate.",
}

export default function ComparePage() {
  return (
    <>
      <DocHeader title={COMPARE_HEADING} lede={COMPARE_LEDE} />
      <DocSection id={COMPARE_SECTIONS.moments.id} title={COMPARE_TITLE} lead={COMPARE_CAPTION}>
        <Compare />
      </DocSection>
      <DocSection
        id={COMPARE_SECTIONS.source.id}
        title="Where the rows come from"
        lead={SOURCE_NOTE}
      />
    </>
  )
}
