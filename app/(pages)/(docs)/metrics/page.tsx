import type { Metadata } from "next"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { FalseAskHeadline } from "@/features/metrics/false-ask-headline"
import { falseAskTally } from "@/features/metrics/measured-figures"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { BENCHMARK_PAGE, METRICS_SECTIONS, OPERATIONS_PAGE } from "../docs-map"

const METHOD_RULE =
  "Every figure on this page carries the command that produced it and the size of the set it came from. A number without a method is not published here, so a figure reads as a dash rather than being filled with an estimate."

const DASH_RULE =
  "A dash has two causes and the command column says which: a named target means the run costs credit and has not been spent, and no command yet means nothing computes the figure."

const HELD_OUT_RULE =
  "Thresholds are tuned on the development set only. The held-out set is labelled once and not read again until the final evaluation, so a number obtained while tuning is never reported here as a generalisation estimate."

export const metadata: Metadata = {
  title: "Measurements",
  description:
    "Every figure carries the command that produced it and the size of the set it came from.",
}

export default function MetricsPage() {
  return (
    <>
      <DocHeader title="Measurements" lede={METHOD_RULE}>
        <Disclosure summary="Why a figure can read as a dash" tone="framed">
          <p>{DASH_RULE}</p>
        </Disclosure>
      </DocHeader>

      <DocSection
        id={METRICS_SECTIONS.headline.id}
        title="What the gate asks when the recognizer was right"
        lead="The cost side comes first: how often the gate asks about a drug name the recognizer already heard correctly, split by the rule that asked."
      >
        <FalseAskHeadline tally={falseAskTally()} />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.policy.id}
        title="Shipped policy"
        lead="Standing read-back, threshold and contrastive pair rule, as the server publishes them."
      >
        <BenchmarkTable entries={shippedPolicyEntries()} label="Shipped policy figures" />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.discipline.id}
        title="Held-out discipline"
        lead={HELD_OUT_RULE}
      />

      <DocSection
        id={METRICS_SECTIONS.more.id}
        title="More measurements"
        lead="The full benchmark and the cost readings each have their own page."
      >
        <PageDirectory pages={[BENCHMARK_PAGE, OPERATIONS_PAGE]} />
      </DocSection>
    </>
  )
}
