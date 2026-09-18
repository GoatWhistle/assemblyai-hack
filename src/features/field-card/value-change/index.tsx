import { Chip } from "@/shared/ui/primitives/chip"
import type { PriorAttempt } from "../prior-attempt"
import styles from "./styles.module.css"

export const UNCHANGED_NOTE =
  "The re-ask returned the same value. Nothing was overwritten, and the repeat is itself the evidence rather than a correction."

export const CHANGED_NOTE =
  "Nothing has been written yet. This is what the field held on the previous attempt and what the current one proposes; the gate still has to pass the new value."

export type ValueChangeProps = {
  readonly prior: PriorAttempt
  readonly current: string
  readonly currentRaw: string
  readonly changed: boolean
}

export function ValueChange({ prior, current, currentRaw, changed }: ValueChangeProps) {
  return (
    <div className={styles.change}>
      <p className={styles.head}>
        <Chip tone="plain">before this attempt</Chip>
        <span className={styles.label}>
          {changed ? "the value would change" : "the value repeats"}
        </span>
      </p>
      <div className={styles.pair}>
        <div className={styles.side}>
          <p className={styles.sideLabel}>attempt {prior.attempt}</p>
          <p className={styles.sideValue}>{prior.normalizedValue ?? "no standard form"}</p>
          <p className={styles.sideRaw}>heard as &ldquo;{prior.rawValue}&rdquo;</p>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          &rarr;
        </span>
        <div className={styles.side}>
          <p className={styles.sideLabel}>now proposed</p>
          <p className={changed ? styles.sideValueNew : styles.sideValue}>{current}</p>
          <p className={styles.sideRaw}>heard as &ldquo;{currentRaw}&rdquo;</p>
        </div>
      </div>
      <p className={styles.note}>{changed ? CHANGED_NOTE : UNCHANGED_NOTE}</p>
    </div>
  )
}
