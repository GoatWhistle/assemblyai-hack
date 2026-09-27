import { Heading, Lede } from "@/shared/ui/typography/heading"
import { RECOGNIZED_AS, RECOGNIZER_CERTAINTY, SPOKEN_TRUTH } from "../demo-arms"
import { REPLAY_LENGTH_LABEL } from "../replay-clock"
import { ReplayNotice, ReplayTag } from "../replay-notice"
import styles from "./styles.module.css"

export const REPLAY_TITLE = `The ${REPLAY_LENGTH_LABEL}`

export const REPLAY_LEDE =
  "One synthesised call runs through the shipped gate twice. Both columns read the drug name back; they differ by one flag, the pair rule, and only the column with the rule on needs a spoken name as the answer."

export const TRUTH_NOTE =
  "Both drugs exist, both pass a catalogue lookup, and both are opioid pain medicines dosed differently, which is why a swap between them is dangerous."

export const GROUND_TRUTH_TITLE = "Ground truth for this replay"

export function GroundTruth({ level }: { readonly level: 2 | 3 }) {
  const Title = level === 2 ? "h2" : "h3"
  return (
    <>
      <Title className="visually-hidden">{GROUND_TRUTH_TITLE}</Title>
      <dl className={styles.truth}>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>The caller said</dt>
          <dd className={styles.factValue}>{SPOKEN_TRUTH}</dd>
        </div>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>The recognizer heard</dt>
          <dd className={styles.factValue}>
            {RECOGNIZED_AS}
            <span className={styles.certainty}>
              certainty {RECOGNIZER_CERTAINTY.toFixed(2)}
            </span>
          </dd>
        </div>
      </dl>
    </>
  )
}

export type ReplayHeadProps = {
  readonly level: 1 | 2
  readonly autoplay: boolean
}

export function ReplayHead({ level, autoplay }: ReplayHeadProps) {
  return (
    <div className={styles.head}>
      <div className={styles.lead}>
        <Heading level={level}>{REPLAY_TITLE}</Heading>
        {autoplay ? <ReplayTag /> : <Lede>{REPLAY_LEDE}</Lede>}
      </div>
      <div className={styles.setup}>
        <GroundTruth level={level === 1 ? 2 : 3} />
        {autoplay ? null : <p className={styles.note}>{TRUTH_NOTE}</p>}
      </div>
      {autoplay ? null : (
        <div className={styles.notice}>
          <ReplayNotice />
        </div>
      )}
    </div>
  )
}

export function ReplayAfterword() {
  return (
    <div className={styles.afterword}>
      <div className={styles.lead}>
        <Lede>{REPLAY_LEDE}</Lede>
        <p className={styles.note}>{TRUTH_NOTE}</p>
      </div>
      <ReplayNotice />
    </div>
  )
}
