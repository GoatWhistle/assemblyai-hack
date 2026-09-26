import { AbsentValue } from "../absent-value"
import { RAW_RUN_AGREEMENT_TEST } from "../benchmark-row"
import type { FalseAskTally } from "../measured-figures"
import styles from "./styles.module.css"

export const HEADLINE_POLICY = "The shipped gate asks about every correct drug name:"

export type FalseAskHeadlineProps = {
  readonly tally: FalseAskTally | null
}

function Method({ tally }: { readonly tally: FalseAskTally }) {
  return (
    <>
      Every one of the {tally.of} drug names was heard correctly, and each is read back once by
      policy. {tally.byStandingReadBack} got the plain read-back, {tally.byThreshold} the
      threshold's re-ask below {tally.threshold}, and {tally.byPairRule} the contrastive
      question, because the name is on the ISMP list. With the pair rule switched off the
      threshold would take {tally.thresholdWithoutPairRule} of the {tally.of}. Recorded
      confidences from synthesised speech through the live recognizer,{" "}
      <code className={styles.inlineCode}>{tally.command}</code>, n = {tally.of}, measured{" "}
      {tally.measuredOn ?? "on an unrecorded date"}.
    </>
  )
}

function Split({ tally }: { readonly tally: FalseAskTally }) {
  const parts = [
    { key: "standing", label: "plain read-back", count: tally.byStandingReadBack },
    {
      key: "threshold",
      label: `threshold re-ask below ${tally.threshold}`,
      count: tally.byThreshold,
    },
    { key: "pair", label: "contrastive question", count: tally.byPairRule },
  ]
  return (
    <ul className={styles.split} aria-label="How each correct drug name was asked about">
      {parts.map((part) => (
        <li
          key={part.key}
          className={styles.part}
          data-route={part.key}
          style={{ flexGrow: Math.max(part.count, 1) }}
        >
          <span className={styles.count}>{part.count}</span>
          <span className={styles.partLabel}>{part.label}</span>
        </li>
      ))}
    </ul>
  )
}

export function FalseAskHeadline({ tally }: FalseAskHeadlineProps) {
  const dash = <AbsentValue />
  return (
    <div className={styles.headline}>
      <p className={styles.figure} data-headline="false-asks">
        {HEADLINE_POLICY} {tally === null ? dash : tally.asked} of{" "}
        {tally === null ? dash : tally.of}.
      </p>
      {tally === null ? null : <Split tally={tally} />}
      <p className={styles.method}>
        {tally === null ? (
          "Not measured yet: no recorded run supplies a correctly heard value to count against."
        ) : (
          <Method tally={tally} />
        )}
      </p>
      <p className={styles.agreement}>
        Published totals match raw runs {"—"} a test fails if they disagree:{" "}
        <code className={styles.inlineCode}>{RAW_RUN_AGREEMENT_TEST}</code>
      </p>
    </div>
  )
}
