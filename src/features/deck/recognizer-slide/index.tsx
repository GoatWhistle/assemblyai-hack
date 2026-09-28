import type { CSSProperties } from "react"
import { ABSENT, DRUG_NAME_THRESHOLD, recognizerFigures, UNMEASURED } from "../figures"
import styles from "./styles.module.css"

function position(confidence: number, floor: number): CSSProperties {
  return { "--x": (confidence - floor) / (1 - floor) } as CSSProperties
}

export function RecognizerSlide() {
  const { scored, errors, aboveThreshold, floor } = recognizerFigures()
  const correct = scored.filter((entry) => entry.correct)
  const ticks = [floor, (floor + 1) / 2, 1]
  return (
    <div className={styles.layout}>
      <figure className={styles.chart}>
        <figcaption className={styles.caption}>
          Lowest word confidence, {scored.length} recorded drug names
        </figcaption>
        <div className={styles.plot}>
          <div className={styles.row}>
            <p className={styles.rowLabel}>{correct.length} heard right</p>
            <div className={styles.track} style={position(DRUG_NAME_THRESHOLD, floor)}>
              <span className={styles.zone} aria-hidden="true" />
              {correct.map((entry, index) => (
                <span
                  className={styles.dot}
                  key={`${entry.spoken}-${index}`}
                  style={position(entry.minConfidence, floor)}
                />
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <p className={styles.rowLabel}>{errors.length} heard wrong</p>
            <div className={styles.track} style={position(DRUG_NAME_THRESHOLD, floor)}>
              <span className={styles.zone} aria-hidden="true" />
              {errors.map((entry, index) => (
                <span
                  className={`${styles.dot} ${styles.wrong}`}
                  key={`${entry.spoken}-${index}`}
                  style={position(entry.minConfidence, floor)}
                />
              ))}
            </div>
          </div>
          <p className={styles.zoneLabel} style={position(DRUG_NAME_THRESHOLD, floor)}>
            a threshold alone writes everything right of {DRUG_NAME_THRESHOLD.toFixed(2)}
          </p>
          <div className={styles.axis} aria-hidden="true">
            {ticks.map((tick) => (
              <span className={styles.tick} key={tick} style={position(tick, floor)}>
                {tick.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.facts}>
          <p className={styles.fact}>
            <strong className={styles.factValue}>
              {aboveThreshold.length} of {errors.length}
            </strong>
            errors at or above {DRUG_NAME_THRESHOLD.toFixed(2)}
          </p>
          <p className={styles.fact}>
            <strong className={styles.factValue}>
              {errors.length} of {errors.length}
            </strong>
            refused by the catalogue
          </p>
        </div>
      </figure>

      <section className={styles.open} aria-label="Not measured yet">
        <p className={styles.openHead}>Not measured yet</p>
        <ul className={styles.unmeasured}>
          {UNMEASURED.map((figure) => (
            <li className={styles.gap} key={figure}>
              <span className={styles.dash}>{ABSENT}</span>
              <span className={styles.gapLabel}>{figure}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
