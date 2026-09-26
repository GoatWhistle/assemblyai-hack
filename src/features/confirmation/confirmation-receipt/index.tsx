import type { ConfirmationEvidence } from "@/domain"
import { Timecode } from "@/shared/ui/data-display/timecode"
import { Chip } from "@/shared/ui/primitives/chip"
import {
  CONFIRMATION_STATUS_LABEL,
  CONFIRMATION_STATUS_TONE,
  confirmationStatusOf,
} from "../confirmation-status"
import styles from "./styles.module.css"

export type ConfirmationReceiptProps = {
  readonly evidence: ConfirmationEvidence
}

export function ConfirmationReceipt({ evidence }: ConfirmationReceiptProps) {
  const status = confirmationStatusOf(evidence)
  const words = evidence.callerTurn?.words ?? []
  const first = words[0]
  const last = words[words.length - 1]
  return (
    <div className={styles.receipt}>
      <p className={styles.head}>
        <Chip tone={CONFIRMATION_STATUS_TONE[status]}>{CONFIRMATION_STATUS_LABEL[status]}</Chip>
        <code className={styles.code} data-status={status}>
          {evidence.reasonCode}
        </code>
      </p>
      <dl className={styles.turns}>
        <div className={styles.turn}>
          <dt className={styles.who}>Agent read back</dt>
          {evidence.readBack === null ? (
            <dd className={styles.missing}>no read-back turn was recorded</dd>
          ) : (
            <dd className={styles.said}>
              &ldquo;{evidence.readBack.text}&rdquo;{" "}
              <span className={styles.meta}>
                {evidence.readBack.completed ? "played" : "cut off at"}{" "}
                <Timecode startMs={evidence.readBack.playedMs} /> of{" "}
                <Timecode startMs={evidence.readBack.durationMs} />
              </span>
            </dd>
          )}
        </div>
        <div className={styles.turn}>
          <dt className={styles.who}>Caller answered</dt>
          {evidence.callerTurn === null ? (
            <dd className={styles.missing}>no caller turn followed the read-back</dd>
          ) : (
            <dd className={styles.said}>
              &ldquo;{evidence.callerTurn.transcript}&rdquo;{" "}
              <span className={styles.meta}>
                turn {evidence.callerTurn.turnOrder}
                {first === undefined || last === undefined ? null : (
                  <>
                    {" · "}
                    <Timecode startMs={first.startMs} endMs={last.endMs} />
                  </>
                )}
              </span>
            </dd>
          )}
        </div>
      </dl>
    </div>
  )
}
