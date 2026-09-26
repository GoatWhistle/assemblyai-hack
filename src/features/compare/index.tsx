import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"
import { formatCertainty, GateVerdict, MOMENTS, type Moment } from "./moments"
import styles from "./styles.module.css"

export { formatCertainty, GateVerdict, MOMENTS, thresholdOnly, verdictFor } from "./moments"

export const COMPARE_TITLE =
  "Six moments, decided by the shipped gate and without its two rules"

export const COMPARE_CAPTION =
  "Each row is one synthesised candidate decided by the shipped gate as this page renders. The last column runs the same candidate through the same decision function with the pair rule and the standing read-back switched off, which leaves a confidence threshold plus the validators."

export const COLUMN = {
  said: "Said",
  heard: "Heard",
  certainty: "Recognizer certainty",
  verdict: "Gate verdict",
  withoutGate: "Threshold and validators only",
} as const

const COLUMN_COUNT = Object.keys(COLUMN).length

export const ALSO_ASKS = "Also asks:"

export const PAIR_OUTRANKS_NOTE = "outranked by the published pair"

export function partnersNote(partners: readonly string[]): string {
  return `on the ISMP list with ${partners.join(", ")}`
}

export const SOURCE_NOTE =
  "These candidates are synthesised from the documented message shapes, not recorded from a live call. The verdicts are not: every one of them is computed by decide() from the gate package, over the real field policy table."

export function verdictTone(moment: Moment): ChipTone {
  if (moment.verdict === GateVerdict.Pass) {
    return "accepted"
  }
  if (moment.verdict === GateVerdict.Refused) {
    return "validator"
  }
  return moment.pairOutranksCertainty ? "lasa" : "asking"
}

function outcomeClass(moment: Moment): string | undefined {
  if (!moment.withoutGateWrites) {
    return styles.value
  }
  return moment.verdict === GateVerdict.Pass ? styles.written : styles.slipped
}

export function WithoutGate({
  moment,
  className,
}: {
  readonly moment: Moment
  readonly className: string | undefined
}) {
  if (moment.withoutGateWrites) {
    return <span className={className}>{moment.withoutGateText}</span>
  }
  return (
    <span className={styles.also}>
      {ALSO_ASKS} <code className={styles.code}>{moment.withoutGate.reasonCode}</code>
    </span>
  )
}

function MomentGroup({ moment }: { readonly moment: Moment }) {
  return (
    <tbody className={styles.group}>
      <tr>
        <th scope="rowgroup" colSpan={COLUMN_COUNT} className={styles.moment}>
          {moment.title}
        </th>
      </tr>
      <MomentCells moment={moment} />
    </tbody>
  )
}

function MomentCells({ moment }: { readonly moment: Moment }) {
  return (
    <tr className={styles.row} data-moment={moment.id}>
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
        <WithoutGate moment={moment} className={outcomeClass(moment)} />
      </td>
    </tr>
  )
}

export function Compare() {
  return (
    <div className={styles.frame}>
      <table className={styles.table}>
        <caption className="visually-hidden">{COMPARE_TITLE}</caption>
        <thead className={styles.head}>
          <tr>
            {Object.values(COLUMN).map((label) => (
              <th key={label} scope="col" className={styles.columnHead}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {MOMENTS.map((moment) => (
          <MomentGroup key={moment.id} moment={moment} />
        ))}
      </table>
    </div>
  )
}
