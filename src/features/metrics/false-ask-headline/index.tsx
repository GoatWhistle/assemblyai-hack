import type { BenchmarkRow } from "@/domain"
import { ShareBar, type ShareSegment } from "@/shared/ui/data-display/chart"
import { Command } from "@/shared/ui/data-display/command"
import { Method } from "@/shared/ui/data-display/method"
import { AbsentValue } from "../absent-value"
import { RAW_RUN_AGREEMENT_TEST } from "../benchmark-row"
import type { FalseAskTally } from "../measured-figures"
import styles from "./styles.module.css"

export const HEADLINE_POLICY =
  "The shipped gate as a whole, not the pair rule alone, asks about every correct drug name:"

export type FalseAskHeadlineProps = {
  readonly tally: FalseAskTally | null
  readonly contrastive?: BenchmarkRow | null
  readonly compact?: boolean
}

function Account({
  tally,
  contrastive,
}: {
  readonly tally: FalseAskTally
  readonly contrastive: BenchmarkRow | null
}) {
  return (
    <>
      Every one of the {tally.of} drug names was heard correctly, and each is read back once by
      policy; each mechanism pays for its own share. {tally.byStandingReadBack} got the plain
      read-back, {tally.byThreshold} the threshold&rsquo;s re-ask below {tally.threshold}, and{" "}
      {tally.byPairRule} the pair rule&rsquo;s contrastive question, because the name is on the
      ISMP list. With the pair rule switched off the threshold would take{" "}
      {tally.thresholdWithoutPairRule} of the {tally.of}. Recorded confidences from synthesised
      speech through the live recognizer, <Command value={tally.command} />,{" "}
      <span className={styles.size}>n = {tally.of}</span>
      {contrastive === null ? null : ", scored against the full 2023 ISMP list"}.
    </>
  )
}

function Split({ tally }: { readonly tally: FalseAskTally }) {
  const segments: readonly ShareSegment[] = [
    { key: "standing", label: "plain read-back", count: tally.byStandingReadBack },
    {
      key: "threshold",
      label: `threshold re-ask below ${tally.threshold}`,
      count: tally.byThreshold,
      tone: "threshold",
    },
    {
      key: "pair",
      label: "pair rule: contrastive question",
      count: tally.byPairRule,
      tone: "lasa",
    },
  ]
  return (
    <ShareBar label="How the shipped gate asked about each correct name" segments={segments} />
  )
}

function PairCost({
  tally,
  contrastive,
}: {
  readonly tally: FalseAskTally | null
  readonly contrastive: BenchmarkRow | null
}) {
  const dash = <AbsentValue />
  return (
    <p className={styles.figure} data-headline="pair-cost">
      The pair rule turns the read-back of{" "}
      <strong>
        {tally === null ? dash : tally.byPairRule} of {tally === null ? dash : tally.of}
      </strong>{" "}
      correct drug names into its longer, contrastive question
      {contrastive === null ? null : <> ({contrastive.value})</>}.
    </p>
  )
}

export function FalseAskHeadline({
  tally,
  contrastive = null,
  compact = false,
}: FalseAskHeadlineProps) {
  const dash = <AbsentValue />
  if (compact) {
    return (
      <div className={styles.headline}>
        <PairCost tally={tally} contrastive={contrastive} />
        {tally === null ? null : (
          <p className={styles.method}>
            <Method
              command={tally.command}
              n={tally.of}
              set={contrastive === null ? undefined : "scored against the 2023 ISMP list"}
            />
          </p>
        )}
      </div>
    )
  }
  return (
    <div className={styles.headline}>
      <PairCost tally={tally} contrastive={contrastive} />
      <p className={styles.policy} data-headline="false-asks">
        {HEADLINE_POLICY} {tally === null ? dash : tally.asked} of{" "}
        {tally === null ? dash : tally.of}.
      </p>
      {tally === null ? null : <Split tally={tally} />}
      <p className={styles.method}>
        {tally === null ? (
          "Not measured yet: no recorded run supplies a correctly heard value to count against."
        ) : (
          <Account tally={tally} contrastive={contrastive} />
        )}
      </p>
      <p className={styles.agreement}>
        Published totals match raw runs {"—"} a test fails if they disagree:{" "}
        <Command value={RAW_RUN_AGREEMENT_TEST} />
      </p>
    </div>
  )
}
