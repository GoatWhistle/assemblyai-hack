import { Chip } from "@/shared/ui/primitives/chip"
import { breakable, COLUMN, PAIR_OUTRANKS_NOTE, partnersNote, verdictTone } from ".."
import { formatCertainty, type Moment } from "../moments"
import styles from "./styles.module.css"

export type MomentStripProps = {
  readonly moment: Moment
}

export function MomentStrip({ moment }: MomentStripProps) {
  return (
    <figure className={styles.strip} data-moment={moment.id}>
      <figcaption className={styles.caption}>{moment.title}</figcaption>
      <dl className={styles.stops}>
        <div className={styles.stop}>
          <dt className={styles.label}>{COLUMN.said}</dt>
          <dd className={styles.value}>{moment.said}</dd>
        </div>
        <div className={styles.stop}>
          <dt className={styles.label}>{COLUMN.heard}</dt>
          <dd className={styles.value}>{moment.heard}</dd>
          {moment.partners.length === 0 ? null : (
            <dd className={styles.note}>{partnersNote(moment.partners)}</dd>
          )}
        </div>
        <div className={styles.stop}>
          <dt className={styles.label}>{COLUMN.certainty}</dt>
          <dd className={styles.value}>{formatCertainty(moment.certainty)}</dd>
          {moment.pairOutranksCertainty ? (
            <dd className={styles.note}>{PAIR_OUTRANKS_NOTE}</dd>
          ) : null}
        </div>
        <div className={styles.stop}>
          <dt className={styles.label}>{COLUMN.verdict}</dt>
          <dd className={styles.verdict}>
            <Chip tone={verdictTone(moment)}>{moment.verdict}</Chip>
            <code className={styles.code}>{breakable(moment.decision.reasonCode)}</code>
          </dd>
        </div>
        <div className={`${styles.stop} ${styles.without}`}>
          <dt className={styles.label}>{COLUMN.withoutGate}</dt>
          <dd className={moment.withoutGateWrites ? styles.slipped : styles.value}>
            {breakable(moment.withoutGateText)}
          </dd>
        </div>
      </dl>
    </figure>
  )
}
