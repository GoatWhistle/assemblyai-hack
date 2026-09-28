import type { CSSProperties } from "react"
import styles from "./styles.module.css"

const PER_TURN = 0.8469

const TURNS = [1, 2, 3, 4, 5].map((turn) => ({ turn, clean: PER_TURN ** turn }))

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function ProblemSlide() {
  return (
    <div className={styles.layout}>
      <div className={styles.figure}>
        <p className={styles.value}>15.31%</p>
        <p className={styles.label}>of entities misheard by Universal-3.5 Pro Realtime</p>
      </div>

      <figure className={styles.chart}>
        <figcaption className={styles.caption}>
          Calls still error-free after each turn
        </figcaption>
        <ol className={styles.turns}>
          {TURNS.map(({ turn, clean }) => (
            <li
              className={turn === TURNS.length ? `${styles.turn} ${styles.last}` : styles.turn}
              key={turn}
              style={{ "--clean": clean } as CSSProperties}
            >
              <span className={styles.bar}>
                <span className={styles.fill} />
              </span>
              <span className={styles.share}>{percent(clean)}</span>
              <span className={styles.turnLabel}>turn {turn}</span>
            </li>
          ))}
        </ol>
      </figure>
    </div>
  )
}
