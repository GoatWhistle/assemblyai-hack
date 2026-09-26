import type { Metadata } from "next"
import { COMPARE_CAPTION, COMPARE_TITLE, Compare, SOURCE_NOTE } from "@/features/compare"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { COMPARE_SECTIONS } from "../docs-map"

const COMPARE_HEADING = "What the pair rule and read-back change, one moment at a time"

const COMPARE_LEDE =
  "Said, heard, the recognizer's own certainty, the gate's verdict with its reason code, and what the same gate writes with only its threshold and validators left on. Where the two last columns disagree is where the pair rule and the standing read-back earn their place."

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Six synthesised moments side by side: what was said, what the recognizer heard, its certainty, the gate's verdict and reason code, and what a threshold and the validators alone would have let into the order.",
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
        title="The rows are synthesised; the verdicts are computed"
        lead={SOURCE_NOTE}
      />
    </>
  )
}
