import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { Panel } from "@/shared/ui/primitives/panel"
import { ErrorState } from "@/shared/ui/states/error-state"
import { AutoDegrade } from "../../auto-degrade"
import type { FaultDetail } from "../../session-options"
import { FAULT_COPY, type SessionFault } from "../../session-status"
import styles from "./styles.module.css"

const REPLAY_HREF = "/?judge=1#replay"

export type FaultPanelProps = {
  readonly fault: SessionFault
  readonly faultDetail?: FaultDetail | null
  readonly onStart?: () => void
}

export function FaultPanel({ fault, faultDetail = null, onStart }: FaultPanelProps) {
  const copy = FAULT_COPY[fault]
  return (
    <div className={styles.fault}>
      <Panel padding="none">
        <ErrorState
          title={copy.title}
          body={
            <>
              <p>{copy.body}</p>
              {faultDetail === null ? null : (
                <p>
                  Reported as <code>{faultDetail.code}</code>: {faultDetail.message}
                </p>
              )}
              <p>{copy.remedy}</p>
            </>
          }
          code={fault}
          actions={
            <>
              <Button onClick={onStart}>Try again</Button>
              <ActionLink href={REPLAY_HREF}>Run the replay instead</ActionLink>
            </>
          }
        />
      </Panel>
      <AutoDegrade key={fault} fault={fault} />
    </div>
  )
}
