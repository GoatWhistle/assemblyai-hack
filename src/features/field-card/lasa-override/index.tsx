import type { LasaRisk } from "@/domain"
import { LASA_NOT_AN_ACCUSATION } from "@/features/gate-banner/hypothesis-language"
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
        <Chip tone="lasa" glyph="?">
          Look-alike sound-alike pair
        </Chip>
        <span>Needs confirming, whatever the certainty says</span>
      </p>
      <p className={styles.overrideBody}>
        {aboveThreshold
          ? `The recognizer reported ${minConfidence.toFixed(2)} certainty, at or above this field's ${threshold.toFixed(2)} threshold, and that does not settle which name was spoken. Certainty describes the acoustics it received, not which of two similar-sounding medicines the caller chose. The published pair is why the value is confirmed rather than written.`
          : `The recognizer reported ${minConfidence.toFixed(2)} certainty, below this field's ${threshold.toFixed(2)} threshold. Even at 1.00 this value would still be confirmed: the name sits in a published pair, and no number resolves which member of it was said.`}
      </p>
      <p className={styles.overrideBody}>{LASA_NOT_AN_ACCUSATION}</p>
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
