import type { Metadata } from "next"
import Link from "next/link"
import type { ReasonCode } from "@/domain"
import { MOMENTS } from "@/features/compare"
import { MomentStrip } from "@/features/compare/moment-strip"
import { GATE_REASONS, STANDING_READ_BACK_LINE } from "@/features/how-it-works/gate-reasons"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { CatchCostHeadline } from "@/features/metrics/catch-cost-headline"
import { confidenceFigures, falseAskTally } from "@/features/metrics/measured-figures"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import { abCatch, contrastiveShareRow } from "@/features/metrics/report-figures"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { Tabs } from "@/shared/ui/navigation/tabs"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { DOCS_PAGES, OVERVIEW_SECTIONS, REPLAY_HUB } from "../docs-map"
import styles from "./styles.module.css"

const ISMP_COMMAND = "npx tsx scripts/measure/ismp-coverage.ts"

export const metadata: Metadata = {
  title: "Docs",
  description:
    "What Readback is, why recognizer certainty cannot rule out a look-alike drug name, when the gate asks again, and what the pair rule catches beside what it costs.",
}

function momentFor(code: ReasonCode) {
  return MOMENTS.find((moment) => moment.decision.reasonCode === code) ?? null
}

function reasonTabs() {
  return GATE_REASONS.map((reason) => {
    const moment = momentFor(reason.code)
    return {
      id: reason.code,
      label: (
        <span className={styles.tabLabel}>
          <span>{reason.label}</span>
          <code className={styles.tabCode}>{reason.code}</code>
        </span>
      ),
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
  const confident =
    confidenceFigures().find((entry) => entry.id === "errors-above-threshold") ?? null
  return (
    <>
      <DocHeader
        title="How Readback proves it did not mishear"
        lede="Readback is a voice agent that takes prescription orders. Every value carries the spoken words that produced it, the recognizer's certainty over those words and an independent validator's verdict, and it enters the order only when a validator passed it or the caller confirmed it aloud."
      />

      <DocSection
        id={OVERVIEW_SECTIONS.claim.id}
        title="Certainty cannot tell sound-alike names apart"
        lead="A recognizer can be fully certain it heard morphine while the caller said hydromorphone. Certainty describes the acoustics, not which of two similar names was meant."
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
        title="When the agent asks again, and which question it asks"
        lead={STANDING_READ_BACK_LINE}
      >
        <Tabs label="Three reasons to ask again" items={reasonTabs()} />
        <p className={styles.note}>
          The last column of each strip runs the same candidate with the pair rule and the
          standing read-back switched off, leaving a confidence threshold and the validators.
        </p>
      </DocSection>

      <DocSection
        id={OVERVIEW_SECTIONS.numbers.id}
        title="The pair rule catches every seeded mishearing, and asks about every correct name"
        lead="The measured catch beside its cost, each with the command that produced it, the size of its set and its date."
      >
        <CatchCostHeadline
          ab={abCatch()}
          confident={confident}
          tally={falseAskTally()}
          contrastive={contrastiveShareRow()}
        />
        <BenchmarkTable
          entries={shippedPolicyEntries().filter((entry) => entry.row.command === ISMP_COMMAND)}
          label="Size of the published list"
          caption="How much of the catalogue the pair rule touches."
          compact
        />
        <div className={styles.actions}>
          <ActionLink href="/metrics">All measurements</ActionLink>
          <ActionLink href="/docs/limitations">What this cannot prove</ActionLink>
        </div>
      </DocSection>

      <DocSection
        id={OVERVIEW_SECTIONS.map.id}
        title="Map of the docs"
        lead="Each page opens with a short lead and puts its evidence directly beneath it. The replay hub holds the judge's material."
      >
        <PageDirectory
          pages={DOCS_PAGES.filter((page) => page.href !== "/docs")}
          withChildren
        />
        <div className={styles.hub}>
          <p className={styles.hubTitle}>{REPLAY_HUB.label}</p>
          <p className={styles.note}>{REPLAY_HUB.summary}</p>
          <ul className={styles.hubLinks}>
            {REPLAY_HUB.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.hubLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DocSection>
    </>
  )
}
