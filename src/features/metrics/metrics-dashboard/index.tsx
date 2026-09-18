import { FigureWithMethod } from "@/shared/ui/data-display/figure-with-method"
import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import { closeCodeRows, closeCodeSetDescription } from "../close-code-tally"
import { confidenceFigures, errorRateFigures } from "../measured-figures"
import {
  type CloseCodeTally,
  GATE_METRICS,
  LATENCY_METRICS,
  type MetricDefinition,
} from "../metric-definitions"
import styles from "./styles.module.css"

export type MetricsDashboardProps = {
  readonly gateMetrics?: readonly MetricDefinition[]
  readonly latencyMetrics?: readonly MetricDefinition[]
  readonly closeCodes?: readonly CloseCodeTally[]
}

function Figures({ metrics }: { readonly metrics: readonly MetricDefinition[] }) {
  return (
    <div className={styles.figures}>
      {metrics.map((metric) => (
        <FigureWithMethod
          key={metric.id}
          name={metric.name}
          value={metric.value}
          meaning={metric.meaning}
          command={metric.command}
          setDescription={metric.setDescription}
          tone={metric.tone ?? "neutral"}
        />
      ))}
    </div>
  )
}

export function MetricsDashboard({
  gateMetrics = GATE_METRICS,
  latencyMetrics = LATENCY_METRICS,
  closeCodes = closeCodeRows(),
}: MetricsDashboardProps) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.lede}>
        <h1 className={styles.ledeTitle}>Measurements</h1>
        <p className={styles.ledeBody}>
          Every figure on this page carries the command that produced it and the size of the set
          it came from. A number without a method is not published here, so a figure reads as
          not measured yet rather than being filled with an estimate. Where it says that, the
          run has not happened or the set is sealed, and the method line says which.
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
        title="What the recognizer got wrong"
        note="measured on recorded runs, not tuned on"
        padding="tight"
      >
        <Figures metrics={errorRateFigures()} />
      </Panel>

      <Panel
        title="Why confidence is not the check"
        note="the cost and the catch, side by side"
        padding="tight"
      >
        <Figures metrics={confidenceFigures()} />
      </Panel>

      <Panel
        title="What the gate costs and catches"
        note="blank on purpose: the set is sealed, not unrun"
        padding="tight"
      >
        <Figures metrics={gateMetrics} />
      </Panel>

      <Panel
        title="Latency"
        note="blank until a paid run; browser measurements are labelled as such"
        padding="tight"
      >
        <Figures metrics={latencyMetrics} />
      </Panel>

      <Panel title="Socket close codes" padding="tight">
        <div className={styles.tableWrap}>
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
        </div>
      </Panel>
    </div>
  )
}
