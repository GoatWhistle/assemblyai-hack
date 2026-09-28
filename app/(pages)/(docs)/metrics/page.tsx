import type { Metadata } from "next"
import { glossaryHref } from "@/features/how-it-works/glossary/terms"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { CatchCostHeadline, headlineTitle } from "@/features/metrics/catch-cost-headline"
import { confidenceFigures, falseAskTally } from "@/features/metrics/measured-figures"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import {
  abCatch,
  contrastiveShareRow,
  HELD_OUT_EER_SCRIPT,
  HELD_OUT_ENTRIES,
  HELD_OUT_GENUINE_ABOVE_THRESHOLD,
  HELD_OUT_REPLICATION,
  HELD_OUT_STRATA_SCRIPT,
  HELD_OUT_STRATUM_SIZE,
  HELD_OUT_TYPOS,
  THRESHOLDS,
} from "@/features/metrics/report-figures"
import { type BarDatum, CompareBars } from "@/shared/ui/data-display/chart"
import { Code } from "@/shared/ui/data-display/code"
import { Command } from "@/shared/ui/data-display/command"
import { Method } from "@/shared/ui/data-display/method"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { TextLink } from "@/shared/ui/navigation/text-link"
import { pageMetadata } from "@/site/page-metadata"
import { BENCHMARK_PAGE, METRICS_SECTIONS, OPERATIONS_PAGE } from "../docs-map"
import styles from "./styles.module.css"

const METHOD_RULE =
  "Every figure on this page carries the command that produced it and the size of the set it came from. A number without a method is not published here, so a figure reads as a dash rather than being filled with an estimate."

const DASH_RULE =
  "A dash has two causes and the command column says which: a named target means the run costs credit and has not been spent, and no command yet means nothing computes the figure."

const HELD_OUT_RULE = `Thresholds are chosen defaults, not tuned on any set: the drug-name threshold is ${THRESHOLDS.drugName.toFixed(2)} and the strength threshold ${THRESHOLDS.strength.toFixed(2)}, reasoned from the cost of an error before any audio existed. The held-out set was drawn and sealed with its hypothesis written down first, then opened once.`

export const metadata: Metadata = pageMetadata({
  title: "Measurements",
  description:
    "What the pair rule catches beside what it costs, the shipped policy's measured rows and the held-out result, each with its command and set size.",
  path: "/metrics",
})

function strataBars(): readonly BarDatum[] {
  return HELD_OUT_ENTRIES.slice(1).map((entry) => ({
    key: entry.id,
    label: entry.row.figure.split(":")[0] ?? entry.row.figure,
    value: Number.parseFloat(String(entry.row.value)),
    max: 100,
    display: entry.row.value,
  }))
}

function Names({ names }: { readonly names: readonly string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <span key={name}>
          {index === 0 ? null : " and "}
          <Code>{name}</Code>
        </span>
      ))}
    </>
  )
}

export default function MetricsPage() {
  const figures = confidenceFigures()
  const confident = figures.find((entry) => entry.id === "errors-above-threshold") ?? null
  const catalogue = figures.find((entry) => entry.id === "catalogue-coverage") ?? null
  const ab = abCatch()
  const tally = falseAskTally()
  const replication = HELD_OUT_REPLICATION
  return (
    <>
      <DocHeader title="Measurements" lede={METHOD_RULE}>
        <Disclosure summary="Why a figure can read as a dash" tone="framed">
          <p>{DASH_RULE}</p>
        </Disclosure>
      </DocHeader>

      <DocSection
        id={METRICS_SECTIONS.headline.id}
        title={headlineTitle(ab, tally)}
        lead="The catch and its cost at equal weight, and each mechanism with its own number. Showing only one of the two would make the metric one-sided."
      >
        <CatchCostHeadline
          ab={ab}
          confident={confident}
          catalogue={catalogue}
          tally={tally}
          contrastive={contrastiveShareRow()}
        />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.policy.id}
        title="What the shipped gate stops, and what it asks"
        lead={
          <>
            Standing read-back, threshold and contrastive pair rule, as the server publishes
            them. Brackets are{" "}
            <TextLink href={glossaryHref("Wilson interval")}>95% Wilson intervals</TextLink>.
          </>
        }
      >
        <BenchmarkTable entries={shippedPolicyEntries()} label="Shipped policy figures" />
      </DocSection>

      <DocSection
        id={METRICS_SECTIONS.discipline.id}
        title="The held-out set: sealed, opened once, and one hypothesis failed"
        lead={HELD_OUT_RULE}
      >
        <div className={styles.heldOut}>
          <div className={styles.finding}>
            <div className={styles.claim}>
              <p className={styles.prose}>
                <strong>The pre-registered hypothesis did not replicate.</strong> It predicted
                that rarer names fail more, with intervals clear of each other; the three strata
                overlap, and the result is published as a negative one rather than dropped.
              </p>
              <p className={styles.prose}>
                <strong>What replicated is the overall error rate:</strong>{" "}
                {replication.heldOutRate} on the held-out set against {replication.controlRate}{" "}
                on the control corpus.
              </p>
            </div>
            <div className={styles.chart}>
              <CompareBars
                label="Entity error rate on the held-out set, by stratum"
                bars={strataBars()}
              />
              <p className={styles.method}>
                <Method
                  command={HELD_OUT_STRATA_SCRIPT}
                  n={`${HELD_OUT_STRATUM_SIZE} each`}
                  set="three rarity strata of eval/heldout"
                />
              </p>
            </div>
          </div>
          <BenchmarkTable
            entries={HELD_OUT_ENTRIES}
            label="Held-out figures"
            caption="The held-out run, as the report publishes it, each row with the command that reprints it from the recorded file."
          />
          <Disclosure
            summary={`The ${replication.aboveThreshold} errors at or above the threshold`}
          >
            <p className={styles.method}>
              Of the {replication.errors} held-out errors, {replication.aboveThreshold} sat at
              or above the {THRESHOLDS.drugName.toFixed(2)} threshold. Two are typos our own
              sampler drew from the FDA file (<Names names={HELD_OUT_TYPOS} />
              ), so the recognizer was scored wrong for hearing the real word; the other two,{" "}
              <Names names={HELD_OUT_GENUINE_ABOVE_THRESHOLD} />, are genuine recognizer errors
              that a threshold alone would have passed. <Command value={HELD_OUT_EER_SCRIPT} />{" "}
              prints all {replication.errors}. Without the two typo items the rate is{" "}
              {replication.withoutTyposRate}, n = {replication.withoutTyposN}; both figures are
              published, because choosing the flattering one after seeing them is what the seal
              exists to prevent.
            </p>
          </Disclosure>
          <p className={styles.method}>
            The gate&rsquo;s own catch and false-ask rates on the held-out set are not scored
            yet; they read as dashes under{" "}
            <TextLink href="/metrics/benchmark#unmeasured">Not measured yet</TextLink>.
          </p>
        </div>
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
