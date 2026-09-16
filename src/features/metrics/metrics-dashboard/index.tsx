import { FigureWithMethod } from "@/shared/ui/data-display/figure-with-method"
import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import {
  CLOSE_CODE_ROWS,
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
  closeCodes = CLOSE_CODE_ROWS,
}: MetricsDashboardProps) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.lede}>
        <h1 className={styles.ledeTitle}>Measurements</h1>
        <p className={styles.ledeBody}>
          Every figure on this page carries the command that produced it and the size of the set
          it came from. A number without a method is not published here, so figures read as not
          measured yet until a run fills them in.
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

      <Panel title="What the gate costs and catches" padding="tight">
        <Figures metrics={gateMetrics} />
      </Panel>

      <Panel title="Latency" note="browser measurements are labelled as such" padding="tight">
        <Figures metrics={latencyMetrics} />
      </Panel>

      <Panel title="Socket close codes" padding="tight">
        <div className={styles.tableWrap}>
          <table className={styles.closeTable}>
            <caption>
              Counted per session across both sockets. 3008 and 3009 are alert-worthy on the
              first occurrence, because billing runs on socket lifetime rather than audio
              volume.
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
