import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { SCRIPT_STEPS } from "./script-steps"
import styles from "./styles.module.css"

export const WATCH_LABEL = "What to watch"

export const NEEDS_MICROPHONE = "needs a microphone"

const COLUMNS: readonly TableColumn[] = [
  { key: "step", title: "Step", kind: "number", size: "fit" },
  { key: "action", title: "Do this", rowHeader: true },
  { key: "watch", title: WATCH_LABEL, kind: "muted", stack: "line" },
]

export function DemoScript() {
  return (
    <Table
      label="An extended script"
      columns={COLUMNS}
      rows={SCRIPT_STEPS.map((step, index) => ({
        key: step.id,
        id: `step-${step.id}`,
        cells: {
          step: index + 1,
          action: (
            <span className={styles.action}>
              <span>{step.action}</span>
              {step.href === null && !step.needsMicrophone ? null : (
                <span className={styles.go}>
                  {step.href === null || step.linkLabel === null ? null : (
                    <ActionLink href={step.href} size="small">
                      {step.linkLabel}
                    </ActionLink>
                  )}
                  {step.needsMicrophone ? (
                    <StatusChip status="tag">{NEEDS_MICROPHONE}</StatusChip>
                  ) : null}
                </span>
              )}
            </span>
          ),
          watch: step.watchFor,
        },
      }))}
    />
  )
}
