import type { ReactNode } from "react"
import type { BenchmarkRow } from "@/domain"
import { ShareBar, type ShareSegment } from "@/shared/ui/data-display/chart"
import { Command } from "@/shared/ui/data-display/command"
import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { Method } from "@/shared/ui/data-display/method"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { AbsentValue } from "../absent-value"
import { RAW_RUN_AGREEMENT_TEST } from "../benchmark-row"
import type { FalseAskTally } from "../measured-figures"
import styles from "./styles.module.css"

export const HEADLINE_POLICY =
  "The shipped gate as a whole, not the pair rule alone, asks about every correct drug name:"

export const PAIR_COST_LABEL =
  "Correct drug names put to the pair rule's longer, contrastive question"

export const HOW_COUNTED = "How the cost is counted"

export type FalseAskHeadlineProps = {
  readonly tally: FalseAskTally | null
  readonly contrastive?: BenchmarkRow | null
  readonly compact?: boolean
  readonly children?: ReactNode
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
  return (
    <FigureGroup label="What the pair rule costs">
      <Figure
        figureKey="pair-cost"
        label={PAIR_COST_LABEL}
        value={tally === null ? null : `${tally.byPairRule} of ${tally.of}`}
        interval={contrastive?.value ?? undefined}
        tone="lasa"
      />
    </FigureGroup>
  )
}

function TallyMethod({
  tally,
  contrastive,
}: {
  readonly tally: FalseAskTally
  readonly contrastive: BenchmarkRow | null
}) {
  return (
    <Method
      command={tally.command}
      n={tally.of}
      set={
        contrastive === null
          ? "recorded confidences from synthesised speech through the live recognizer"
          : "recorded confidences from synthesised speech through the live recognizer, scored against the full 2023 ISMP list"
      }
    />
  )
}

export function FalseAskHeadline({
  tally,
  contrastive = null,
  compact = false,
  children,
}: FalseAskHeadlineProps) {
  const dash = <AbsentValue />
  if (compact) {
    return (
      <div className={styles.headline}>
        <PairCost tally={tally} contrastive={contrastive} />
        {tally === null ? null : (
          <p className={styles.method}>
            <TallyMethod tally={tally} contrastive={contrastive} />
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
      {tally === null ? (
        <p className={styles.method}>
          Not measured yet: no recorded run supplies a correctly heard value to count against.
        </p>
      ) : (
        <>
          <Split tally={tally} />
          <p className={styles.method}>
            With the pair rule switched off, the threshold would take{" "}
            {tally.thresholdWithoutPairRule} of the {tally.of}.{" "}
            <TallyMethod tally={tally} contrastive={contrastive} />
          </p>
        </>
      )}
      <Disclosure summary={HOW_COUNTED}>
        {tally === null ? null : (
          <p className={styles.method}>
            Every one of the {tally.of} drug names was heard correctly, and each is read back
            once by policy; each mechanism pays for its own share, and the pair rule&rsquo;s
            share is the names on the ISMP list.
          </p>
        )}
        {children}
        <p className={styles.method}>
          Published totals match raw runs, and a test fails if they disagree:{" "}
          <Command value={RAW_RUN_AGREEMENT_TEST} />
        </p>
      </Disclosure>
    </div>
  )
}
