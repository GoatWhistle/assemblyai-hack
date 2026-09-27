import { useId } from "react"
import { describeReason, SEVERITY_STATUS } from "@/features/gate-banner/reason-language"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import { SAY_THESE } from "./phrases"
import styles from "./styles.module.css"

const SAY_THESE_HEADING = "Say these three things"

const COLUMNS: readonly TableColumn[] = [
  { key: "say", title: "Say", rowHeader: true },
  { key: "verdict", title: "What the gate does", size: "fit" },
  { key: "why", title: "Why", kind: "muted", stack: "line" },
]

export function SayThese() {
  const headingId = useId()
  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <div className={styles.head}>
        <Heading level={3} id={headingId}>
          {SAY_THESE_HEADING}
        </Heading>
        <Lede>
          On the live call, these three sentences show the three ways a value is proved or
          stopped. The outcome and reason code beside each one come from the shipped gate
          function, run on this page.
        </Lede>
      </div>
      <Table
        label="Three sentences and what the gate does with each"
        columns={COLUMNS}
        rows={SAY_THESE.map((entry) => ({
          key: entry.id,
          cells: {
            say: <span className={styles.say}>&ldquo;{entry.say}&rdquo;</span>,
            verdict: (
              <span className={styles.expected}>
                <StatusChip
                  status={SEVERITY_STATUS[describeReason(entry.decision.reasonCode).severity]}
                >
                  {entry.outcome}
                </StatusChip>
                <code className={styles.code}>{entry.decision.reasonCode}</code>
              </span>
            ),
            why: entry.expected,
          },
        }))}
      />
    </section>
  )
}
