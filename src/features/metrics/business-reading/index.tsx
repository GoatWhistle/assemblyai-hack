import { AbsentValue } from "../absent-value"
import { type BusinessFigure, COST_OF_ERROR_NOTE } from "../business-figures"
import styles from "./styles.module.css"

export const NOT_MEASURED_YET = "not measured yet"

export type BusinessReadingProps = {
  readonly figures: readonly BusinessFigure[]
}

export function BusinessReading({ figures }: BusinessReadingProps) {
  return (
    <div className={styles.reading}>
      <dl className={styles.list}>
        {figures.map((figure) => (
          <div key={figure.id} className={styles.item} data-figure={figure.id}>
            <dt className={styles.term}>
              {figure.figure}
              <span className={styles.unit}>{figure.unit}</span>
            </dt>
            <dd className={styles.value}>
              {figure.value === null ? <AbsentValue /> : figure.value}
            </dd>
            {figure.value === null ? (
              <dd className={styles.needs}>
                {NOT_MEASURED_YET}. Needs {figure.needs}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      <p className={styles.note}>{COST_OF_ERROR_NOTE}</p>
    </div>
  )
}
