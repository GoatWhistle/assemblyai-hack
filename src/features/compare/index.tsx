import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"
import { formatCertainty, GateVerdict, MOMENTS, type Moment } from "./moments"
import styles from "./styles.module.css"

export { formatCertainty, GateVerdict, MOMENTS, thresholdOnly, verdictFor } from "./moments"

const COMPARE_TITLE = "Six moments, with the gate and without it"

const COMPARE_CAPTION =
  "Each row is one synthesised candidate decided by the shipped gate as this page renders. The last column runs the same candidate through the same decision function with the pair check and the standing read-back switched off, which is what a confidence threshold alone amounts to."

export const COLUMN = {
  moment: "Moment",
  said: "Said",
  heard: "Heard",
  certainty: "Recognizer certainty",
  verdict: "Gate verdict",
  withoutGate: "Without the gate",
} as const

export const PAIR_OUTRANKS_NOTE = "outranked by the published pair"

export function partnersNote(partners: readonly string[]): string {
  return `on the ISMP list with ${partners.join(", ")}`
}

const SOURCE_NOTE =
  "These candidates are synthesised from the documented message shapes, not recorded from a live call. The verdicts are not: every one of them is computed by decide() from the gate package, over the real field policy table."

function verdictTone(moment: Moment): ChipTone {
  if (moment.verdict === GateVerdict.Pass) {
    return "accepted"
  }
  if (moment.verdict === GateVerdict.Refused) {
    return "escalated"
  }
  return moment.pairOutranksCertainty ? "lasa" : "asking"
}

function outcomeClass(moment: Moment): string | undefined {
  if (!moment.withoutGateWrites) {
    return styles.value
  }
  return moment.verdict === GateVerdict.Pass ? styles.written : styles.slipped
}

function MomentRow({ moment }: { readonly moment: Moment }) {
  return (
    <tr className={styles.row} data-moment={moment.id}>
      <th scope="row" className={styles.moment}>
        {moment.title}
      </th>
      <td className={styles.cell} data-label={COLUMN.said}>
        <span className={styles.value}>{moment.said}</span>
      </td>
      <td className={styles.cell} data-label={COLUMN.heard}>
        <span className={styles.value}>{moment.heard}</span>
        {moment.partners.length === 0 ? null : (
          <span className={styles.note} data-partners={moment.partners.length}>
            {partnersNote(moment.partners)}
          </span>
        )}
      </td>
      <td className={styles.cell} data-label={COLUMN.certainty}>
        <span className={moment.pairOutranksCertainty ? styles.outranked : styles.value}>
          {formatCertainty(moment.certainty)}
        </span>
        {moment.pairOutranksCertainty ? (
          <span className={styles.note}>{PAIR_OUTRANKS_NOTE}</span>
        ) : null}
      </td>
      <td className={styles.cell} data-label={COLUMN.verdict}>
        <span className={styles.verdict}>
          <Chip tone={verdictTone(moment)}>{moment.verdict}</Chip>
          <code className={styles.code}>{moment.decision.reasonCode}</code>
        </span>
      </td>
      <td className={styles.cell} data-label={COLUMN.withoutGate}>
        <span className={outcomeClass(moment)}>{moment.withoutGateText}</span>
      </td>
    </tr>
  )
}

const TITLE_ID = "compare-title"

export function Compare() {
  return (
    <section className={styles.block} aria-labelledby={TITLE_ID}>
      <h2 className={styles.title} id={TITLE_ID}>
        {COMPARE_TITLE}
      </h2>
      <div className={styles.frame}>
        <table className={styles.table}>
          <caption className={styles.caption}>{COMPARE_CAPTION}</caption>
          <thead className={styles.head}>
            <tr>
              {Object.values(COLUMN).map((label) => (
                <th key={label} scope="col" className={styles.columnHead}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOMENTS.map((moment) => (
              <MomentRow key={moment.id} moment={moment} />
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.source}>{SOURCE_NOTE}</p>
    </section>
  )
}
