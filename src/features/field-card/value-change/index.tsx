import { Chip } from "@/shared/ui/primitives/chip"
import type { PriorAttempt } from "../prior-attempt"
import styles from "./styles.module.css"

export const UNCHANGED_NOTE =
  "The re-ask returned the same value. Nothing was overwritten, and the repeat is itself the evidence rather than a correction."

export const CHANGED_NOTE =
  "Nothing has been written yet. This is what the field held on the previous attempt and what the current one proposes; the gate still has to pass the new value."

export const CORRECTED_NOTE =
  "Corrected by the caller: the value heard on the earlier attempt was replaced by the one the caller said aloud, and only the corrected value entered the order."

export type ValueChangeProps = {
  readonly prior: PriorAttempt
  readonly current: string
  readonly currentRaw: string
  readonly changed: boolean
  readonly written?: boolean
}

function noteFor(changed: boolean, written: boolean): string {
  if (!changed) {
    return UNCHANGED_NOTE
  }
  return written ? CORRECTED_NOTE : CHANGED_NOTE
}

export function ValueChange({
  prior,
  current,
  currentRaw,
  changed,
  written = false,
}: ValueChangeProps) {
  return (
    <div className={styles.change}>
      <p className={styles.head}>
        <Chip tone="plain">before this attempt</Chip>
        <span className={styles.label}>
          {changed
            ? written
              ? "the value was corrected"
              : "the value would change"
            : "the value repeats"}
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
          <p className={styles.sideLabel}>{written ? "written" : "now proposed"}</p>
          <p className={changed ? styles.sideValueNew : styles.sideValue}>{current}</p>
          <p className={styles.sideRaw}>heard as &ldquo;{currentRaw}&rdquo;</p>
        </div>
      </div>
      <p className={styles.note}>{noteFor(changed, written)}</p>
    </div>
  )
}
