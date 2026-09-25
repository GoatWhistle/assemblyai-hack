import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import { AbsentValue } from "../absent-value"
import { type BenchmarkEntry, benchmarkEntries, RAW_RUN_AGREEMENT_TEST } from "../benchmark-row"
import { BenchmarkTable } from "../benchmark-table"
import { BUSINESS_FIGURES, type BusinessFigure } from "../business-figures"
import { BusinessReading } from "../business-reading"
import { closeCodeRows, closeCodeSetDescription } from "../close-code-tally"
import { type FalseAskTally, falseAskTally } from "../measured-figures"
import type { CloseCodeTally } from "../metric-definitions"
import { shippedPolicyEntries } from "../policy-figures"
import styles from "./styles.module.css"

export type MetricsDashboardProps = {
  readonly entries?: readonly BenchmarkEntry[]
  readonly policyEntries?: readonly BenchmarkEntry[]
  readonly falseAsks?: FalseAskTally | null
  readonly businessFigures?: readonly BusinessFigure[]
  readonly closeCodes?: readonly CloseCodeTally[]
}

export const HEADLINE_POLICY = "The shipped gate asks about every correct drug name:"

function Headline({ tally }: { readonly tally: FalseAskTally | null }) {
  const dash = <AbsentValue />
  return (
    <div className={styles.headline}>
      <p className={styles.headlineFigure} data-headline="false-asks">
        {HEADLINE_POLICY} {tally === null ? dash : tally.asked} of{" "}
        {tally === null ? dash : tally.of}.
      </p>
      <p className={styles.headlineMethod}>
        {tally === null ? (
          "Not measured yet: no recorded run supplies a correctly heard value to count against."
        ) : (
          <>
            Every one of the {tally.of} drug names was heard correctly, and each is read back
            once by policy. {tally.byStandingReadBack} got the plain read-back,{" "}
            {tally.byThreshold} the threshold's re-ask below {tally.threshold}, and{" "}
            {tally.byPairRule} the contrastive question, because the name is on the ISMP list.
            With the pair rule switched off the threshold would take{" "}
            {tally.thresholdWithoutPairRule} of the {tally.of}. Recorded confidences from
            synthesised speech through the live recognizer,{" "}
            <code className={styles.inlineCode}>{tally.command}</code>, n = {tally.of}, measured{" "}
            {tally.measuredOn ?? "on an unrecorded date"}.
          </>
        )}
      </p>
    </div>
  )
}

export function MetricsDashboard({
  entries = benchmarkEntries(),
  policyEntries = shippedPolicyEntries(),
  falseAsks = falseAskTally(),
  businessFigures = BUSINESS_FIGURES,
  closeCodes = closeCodeRows(),
}: MetricsDashboardProps) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.lede}>
        <h1 className={styles.ledeTitle}>Measurements</h1>
        <p className={styles.ledeBody}>
          Every figure on this page carries the command that produced it and the size of the set
          it came from. A number without a method is not published here, so a figure reads as a
          dash rather than being filled with an estimate. A dash has two causes and the command
          column says which: a named target means the run costs credit and has not been spent,
          and no command yet means nothing computes the figure.
        </p>
        <Headline tally={falseAsks} />
        <p className={styles.agreement}>
          Published totals match raw runs {"—"} a test fails if they disagree:{" "}
          <code className={styles.inlineCode}>{RAW_RUN_AGREEMENT_TEST}</code>
        </p>
        <div className={styles.rule}>
          <p className={styles.ruleTitle}>Held-out discipline</p>
          <p className={styles.ruleBody}>
            Thresholds are tuned on the development set only. The held-out set is labelled once
            and not read again until the final evaluation, so a number obtained while tuning is
            never reported here as a generalisation estimate.
          </p>
        </div>
      </div>

      <Panel
        title="Shipped policy"
        note="standing read-back, threshold and contrastive pair rule, as the server publishes them"
        padding="tight"
      >
        <BenchmarkTable entries={policyEntries} label="Shipped policy figures" />
      </Panel>

      <Panel title="Benchmark" note="figure, value, input, command, n, date" padding="tight">
        <BenchmarkTable entries={entries} />
      </Panel>

      <Panel
        title="Business reading"
        note="derived only from figures above that carry a command"
        padding="tight"
      >
        <BusinessReading figures={businessFigures} />
      </Panel>

      <Panel title="Socket close codes" padding="tight">
        <section
          className={styles.tableWrap}
          aria-label="Socket close codes, scrollable sideways"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a table that scrolls sideways must be reachable by keyboard, which axe checks as scrollable-region-focusable
          tabIndex={0}
        >
          <table className={styles.closeTable}>
            <caption>
              Counted from {closeCodeSetDescription()}. 1008, 3008 and 3009 are alert-worthy on
              the first occurrence, because billing runs on socket lifetime rather than audio
              volume. A run containing any 1008 is a rate-limit artefact and is not scored.
            </caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Meaning</th>
                <th scope="col">Seen</th>
              </tr>
            </thead>
            <tbody>
              {closeCodes.map((row) => (
                <tr key={row.code}>
                  <td className={styles.codeCell}>
                    {row.code}
                    {row.alertWorthy ? (
                      <>
                        {" "}
                        <Chip tone="escalated">alert</Chip>
                      </>
                    ) : null}
                  </td>
                  <td>
                    <span>{row.label}</span>
                    <span className={styles.meaningCell}> {row.meaning}</span>
                  </td>
                  <td className={styles.countCell}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </Panel>
    </div>
  )
}
