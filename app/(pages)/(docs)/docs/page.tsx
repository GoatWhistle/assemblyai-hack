import type { Metadata } from "next"
import type { ReasonCode } from "@/domain"
import { MOMENTS } from "@/features/compare"
import { MomentStrip } from "@/features/compare/moment-strip"
import { GATE_REASONS } from "@/features/how-it-works/gate-reasons"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { benchmarkEntries } from "@/features/metrics/benchmark-row"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { Tabs } from "@/shared/ui/navigation/tabs"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { DOCS_PAGES, OVERVIEW_SECTIONS } from "../docs-map"
import styles from "./styles.module.css"

const CONFIDENT_ERRORS = "errors-above-threshold"

export const metadata: Metadata = {
  title: "Docs",
  description:
    "What Readback is, why recognizer certainty cannot rule out a look-alike drug name, the three reasons the gate asks again, and the measured figures with their commands.",
}

function momentFor(code: ReasonCode) {
  return MOMENTS.find((moment) => moment.decision.reasonCode === code) ?? null
}

function reasonTabs() {
  return GATE_REASONS.map((reason) => {
    const moment = momentFor(reason.code)
    return {
      id: reason.code,
      label: <code className={styles.tabCode}>{reason.code}</code>,
      panel: (
        <div className={styles.reason}>
          <p className={styles.reasonTitle}>{reason.title}</p>
          <p className={styles.reasonBody}>{reason.body}</p>
          {moment === null ? null : <MomentStrip moment={moment} />}
        </div>
      ),
    }
  })
}

export default function DocsOverviewPage() {
  const pairMoment = MOMENTS.find((moment) => moment.pairOutranksCertainty) ?? null
  const figures = [
    ...benchmarkEntries().filter((entry) => entry.id === CONFIDENT_ERRORS),
    ...shippedPolicyEntries(),
  ]
  return (
    <>
      <DocHeader
        title="How Readback proves it did not mishear"
        lede="Readback is a voice agent that takes prescription orders. Every value carries the spoken words that produced it, the recognizer's certainty over those words and an independent validator's verdict, and it enters the order only when a validator passed it or the caller confirmed it aloud."
      />

      <DocSection
        id={OVERVIEW_SECTIONS.claim.id}
        title="Certainty does not protect against homophony"
        lead="A recognizer can be fully certain it heard morphine while the caller said hydromorphone. Certainty describes acoustics; it cannot tell two similar names apart."
      >
        {pairMoment === null ? null : <MomentStrip moment={pairMoment} />}
        <p className={styles.prose}>
          So a drug name on the published ISMP List of Confused Drug Names triggers a mandatory
          re-ask even at certainty 1.00, and the re-ask is contrastive: the agent names both
          drugs, and only a spoken name answers it, never a yes. This is a rule, not a
          threshold, and the product does not weaken it into one.
        </p>
        <div className={styles.actions}>
          <ActionLink href={REPLAY_ENTRY_HREF} tone="primary">
            Watch it catch a staged mishearing
          </ActionLink>
          <ActionLink href="/compare">See all six moments</ActionLink>
        </div>
      </DocSection>

      <DocSection
        id={OVERVIEW_SECTIONS.reasons.id}
        title="Three reasons to re-ask"
        lead="Every value passes one decision function before it can enter the order. The reasons are not interchangeable: the third fires regardless of certainty, and each tab shows the shipped gate deciding a real candidate for it."
      >
        <Tabs label="Three reasons to re-ask" items={reasonTabs()} />
      </DocSection>

      <DocSection
        id={OVERVIEW_SECTIONS.map.id}
        title="Map of the docs"
        lead="Each page opens with a short lead. Proofs, method notes and caveats sit in expandable blocks beneath it, so nothing is dropped to keep a page short."
      >
        <PageDirectory
          pages={DOCS_PAGES.filter((page) => page.href !== "/docs")}
          withChildren
        />
      </DocSection>

      <DocSection
        id={OVERVIEW_SECTIONS.numbers.id}
        title="Key numbers"
        lead="The server's published rows, each with the command that produced it, the size of its set and the date it was measured. A number without a method is not published."
      >
        <BenchmarkTable
          entries={figures}
          label="Key numbers"
          caption="Key numbers, each with its input, command, set size and date."
          compact
        />
        <div className={styles.actions}>
          <ActionLink href="/metrics">All measurements</ActionLink>
          <ActionLink href="/metrics/benchmark">Full benchmark</ActionLink>
        </div>
      </DocSection>
    </>
  )
}
