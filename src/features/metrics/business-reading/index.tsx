import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { NOT_MEASURED_LABEL } from "../benchmark-row"
import { type BusinessFigure, COST_OF_ERROR_NOTE } from "../business-figures"
import styles from "./styles.module.css"

export const NOT_MEASURED_YET = "not measured yet"

export type BusinessReadingProps = {
  readonly figures: readonly BusinessFigure[]
}

export function BusinessReading({ figures }: BusinessReadingProps) {
  return (
    <div className={styles.reading}>
      <FigureGroup>
        {figures.map((figure) => (
          <Figure
            key={figure.id}
            figureKey={figure.id}
            label={figure.figure}
            unit={figure.unit}
            value={figure.value}
            absentLabel={NOT_MEASURED_LABEL}
            note={
              figure.value === null ? `${NOT_MEASURED_YET}. Needs ${figure.needs}` : undefined
            }
          />
        ))}
      </FigureGroup>
      <p className={styles.note}>{COST_OF_ERROR_NOTE}</p>
    </div>
  )
}
