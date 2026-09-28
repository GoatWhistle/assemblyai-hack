import { AB_FIGURES, COST_FIGURES } from "../figures"
import styles from "./styles.module.css"

type Kind = "plain" | "threshold" | "pair"

type Segment = {
  readonly key: Kind
  readonly count: number
  readonly label: string
}

function segments(): readonly Segment[] {
  const tally = COST_FIGURES.tally
  if (tally === null) {
    return []
  }
  return [
    { key: "plain", count: tally.byStandingReadBack, label: "plain read-back" },
    {
      key: "threshold",
      count: tally.byThreshold,
      label: `under ${tally.threshold.toFixed(2)}`,
    },
    { key: "pair", count: tally.byPairRule, label: "pair question" },
  ]
}

function written(figure: string): { readonly hit: number; readonly of: number } {
  const [hit, of] = figure.split("/").map((part) => Number.parseInt(part, 10))
  return { hit: hit ?? 0, of: of ?? 0 }
}

function cases(prefix: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, position) => `${prefix}-${position + 1}`)
}

function Dots({ figure, tone }: { readonly figure: string; readonly tone: "off" | "on" }) {
  const { hit, of } = written(figure)
  const ids = cases(tone, of)
  return (
    <span className={styles.dots} aria-hidden="true">
      {ids.map((id) => (
        <span
          className={ids.indexOf(id) < hit ? `${styles.dot} ${styles[tone]}` : styles.dot}
          key={id}
        />
      ))}
    </span>
  )
}

export function CatchSlide() {
  const parts = segments()
  return (
    <div className={styles.layout}>
      <section className={styles.catch} aria-label="What the pair rule catches">
        <p className={styles.head}>Wrong drug written after a reflex yes</p>
        <div className={styles.arms}>
          <div className={styles.arm}>
            <p className={`${styles.big} ${styles.off}`}>{AB_FIGURES.without}</p>
            <Dots figure={AB_FIGURES.without} tone="off" />
            <p className={styles.armLabel}>without the pair rule</p>
          </div>
          <div className={styles.arm}>
            <p className={`${styles.big} ${styles.on}`}>{AB_FIGURES.with}</p>
            <Dots figure={AB_FIGURES.with} tone="on" />
            <p className={styles.armLabel}>with it</p>
          </div>
        </div>
      </section>

      <section className={styles.cost} aria-label="What the pair rule costs">
        <p className={styles.head}>The cost: the question each correct name gets</p>
        <span className={styles.waffle} aria-hidden="true">
          {parts.flatMap((part) =>
            cases(part.key, part.count).map((id) => (
              <span className={`${styles.cell} ${styles[part.key]}`} key={id} />
            )),
          )}
        </span>
        <ul className={styles.legend}>
          {parts.map((part) => (
            <li className={`${styles.entry} ${styles[part.key]}`} key={part.key}>
              <span className={styles.count}>{part.count}</span>
              <span className={styles.entryLabel}>{part.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.seconds}>
          <strong className={styles.secondsValue}>+{COST_FIGURES.extraSeconds}</strong> per pair
          question, {COST_FIGURES.contrastiveSeconds} against {COST_FIGURES.plainSeconds}
        </p>
      </section>
    </div>
  )
}
