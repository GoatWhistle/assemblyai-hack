import type { Metadata } from "next"
import Link from "next/link"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { CatchCostHeadline } from "@/features/metrics/catch-cost-headline"
import { confidenceFigures, falseAskTally } from "@/features/metrics/measured-figures"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import {
  abCatch,
  contrastiveShareRow,
  HELD_OUT_ENTRIES,
  HELD_OUT_GENUINE_ABOVE_THRESHOLD,
  HELD_OUT_STRATUM_SIZE,
  THRESHOLDS,
} from "@/features/metrics/report-figures"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { BENCHMARK_PAGE, METRICS_SECTIONS, OPERATIONS_PAGE } from "../docs-map"
import styles from "./styles.module.css"

const METHOD_RULE =
  "Every figure on this page carries the command that produced it and the size of the set it came from. A number without a method is not published here, so a figure reads as a dash rather than being filled with an estimate."

const DASH_RULE =
  "A dash has two causes and the command column says which: a named target means the run costs credit and has not been spent, and no command yet means nothing computes the figure."

const HELD_OUT_RULE = `Thresholds are chosen defaults, not tuned on any set: the drug-name threshold is ${THRESHOLDS.drugName.toFixed(2)} and the strength threshold ${THRESHOLDS.strength.toFixed(2)}, reasoned from the cost of an error before any audio existed, and no run searched for an optimum. The held-out set was drawn and sealed on 16 September with its hypothesis written down first, then opened once.`

export const metadata: Metadata = {
  title: "Measurements",
  description:
    "What the pair rule catches beside what it costs, the shipped policy's measured rows and the held-out result, each with its command and set size.",
}

function strataSentence(): string {
  const [rare, mid, common] = HELD_OUT_ENTRIES.slice(1).map(
    (entry) => String(entry.row.value).split(" ")[0],
  )
  return `rare ${rare}, middle ${mid}, common ${common}, n = ${HELD_OUT_STRATUM_SIZE} each`
}

export default function MetricsPage() {
  const confident =
    confidenceFigures().find((entry) => entry.id === "errors-above-threshold") ?? null
  return (
    <>
      <DocHeader title="Measurements" lede={METHOD_RULE}>
        <Disclosure summary="Why a figure can read as a dash" tone="framed">
          <p>{DASH_RULE}</p>
        </Disclosure>
      </DocHeader>

      <DocSection
        id={METRICS_SECTIONS.headline.id}
        title="The pair rule stops every seeded mishearing, and asks about every correct name"
        lead="The catch and its cost, side by side and at equal weight. Showing only one of the two would make the metric one-sided."
      >
        <CatchCostHeadline
          ab={abCatch()}
          confident={confident}
          tally={falseAskTally()}
          contrastive={contrastiveShareRow()}
        />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.policy.id}
        title="What the shipped gate stops, and what it asks"
        lead="Standing read-back, threshold and contrastive pair rule, as the server publishes them. Brackets are 95% Wilson intervals."
      >
        <BenchmarkTable entries={shippedPolicyEntries()} label="Shipped policy figures" />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.discipline.id}
        title="The held-out set: sealed, opened once, and one hypothesis failed"
        lead={HELD_OUT_RULE}
      >
        <BenchmarkTable
          entries={HELD_OUT_ENTRIES}
          label="Held-out figures"
          caption="The held-out run, as the report publishes it, each row with the command that reprints it from the recorded file."
        />
        <p className={styles.prose}>
          <strong>The pre-registered hypothesis did not replicate.</strong> It predicted that
          rarer names fail more, with non-overlapping intervals between the rare and common
          strata: {strataSentence()}, intervals overlapping. It is published as a negative
          result rather than dropped. What did replicate is the part the product rests on: two
          genuine recognizer errors on the held-out set,{" "}
          {HELD_OUT_GENUINE_ABOVE_THRESHOLD.map((name, index) => (
            <span key={name}>
              {index === 0 ? null : " and "}
              <code className={styles.code}>{name}</code>
            </span>
          ))}
          , sat at or above the {THRESHOLDS.drugName.toFixed(2)} threshold and would have passed
          a threshold alone (eval/REPORT.md, held-out section).
        </p>
        <p className={styles.prose}>
          The gate&rsquo;s own figures on the held-out set, its catch rate and its false-ask
          rate, are not scored yet; they read as dashes under{" "}
          <Link href="/metrics/benchmark#unmeasured">Not measured yet</Link>.
        </p>
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.more.id}
        title="Every other figure, and what the gate would cost an order"
        lead="The full benchmark and the cost readings each have their own page."
      >
        <PageDirectory pages={[BENCHMARK_PAGE, OPERATIONS_PAGE]} />
      </DocSection>
    </>
  )
}
