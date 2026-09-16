import type { LasaRisk } from "@/domain"
import { Chip } from "@/shared/ui/primitives/chip"
import styles from "./styles.module.css"

export type LasaOverrideProps = {
  readonly lasa: LasaRisk
  readonly minConfidence: number
  readonly threshold: number
}

export function LasaOverride({ lasa, minConfidence, threshold }: LasaOverrideProps) {
  const aboveThreshold = minConfidence >= threshold
  return (
    <div className={styles.override}>
      <p className={styles.overrideHead}>
        <Chip tone="lasa" glyph="!">
          Look-alike sound-alike pair
        </Chip>
        <span>Confidence does not decide this field</span>
      </p>
      <p className={styles.overrideBody}>
        {aboveThreshold
          ? `The recognizer reported ${minConfidence.toFixed(2)} certainty, at or above this field's ${threshold.toFixed(2)} threshold, and that changes nothing here. Certainty describes the acoustics it received, not which of two similar-sounding medicines was spoken. The published pair is what settles it, so the value is re-asked.`
          : `The recognizer reported ${minConfidence.toFixed(2)} certainty, below this field's ${threshold.toFixed(2)} threshold. Even had it been 1.00, this re-ask would still fire: the name sits in a published pair, and that is decided independently of any number.`}
      </p>
      <div className={styles.alternatives}>
        <span className={styles.altLabel}>Heard as</span>
        <Chip tone="lasa">{lasa.matchedTerm ?? "unknown"}</Chip>
        <span className={styles.altLabel}>confusable with</span>
        {lasa.confusableWith.map((name) => (
          <Chip key={name} tone="plain">
            {name}
          </Chip>
        ))}
      </div>
      <p className={styles.source}>
        source {lasa.source}
        {lasa.sourceRow === null ? "" : ` · ${lasa.sourceRow}`}
      </p>
    </div>
  )
}
