import type { Metadata } from "next"
import { AttackConsole } from "@/features/attack-console"
import { DemoScript } from "@/features/how-it-works/demo-script"
import {
  MICROPHONE_FREE_STEPS,
  SCRIPT_STEPS,
} from "@/features/how-it-works/demo-script/script-steps"
import { GateReasons, STANDING_FIELDS_LINE } from "@/features/how-it-works/gate-reasons"
import { LIMITATIONS, LimitTitles } from "@/features/how-it-works/limits"
import { ProofLadder } from "@/features/how-it-works/proof-ladder"
import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { TextLink } from "@/shared/ui/navigation/text-link"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { pageMetadata } from "@/site/page-metadata"
import { HOW_SECTIONS } from "../docs-map"
import styles from "./styles.module.css"

const SHOWN_LIMITS: readonly string[] = ["provenance", "self-correction", "lasa"]

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description:
    "The gate that decides whether a spoken value may enter a prescription order: when it asks again, what counts as proof per field, an extended script, an attack console, and what the demonstration does not prove.",
  path: "/how-it-works",
})

export default function HowItWorksPage() {
  return (
    <>
      <DocHeader
        title="A value enters the order only after it is proved"
        lede={
          <>
            Read-back is mandatory under ICAO Annex 11 &sect;3.7.3.1 for flight crews and has
            been a Joint Commission requirement for verbal orders and critical test results
            since it became a patient safety goal in 2003 (NPSG.02.01.01; ISMP places it at
            PC.02.01.03 EP 20 in 2017; its 2026 location is not verified). We automate a step
            that regulation already requires and practice routinely skips.{" "}
            <TextLink href="/docs/glossary#citations">The exact clauses</TextLink>
          </>
        }
      >
        <div className={styles.actions}>
          <ActionLink href={REPLAY_ENTRY_HREF} tone="primary" size="large">
            {`Watch the ${REPLAY_LENGTH_LABEL} of a staged mishearing`}
          </ActionLink>
          <ActionLink href={CALL_HREF} size="large">
            Start a call
          </ActionLink>
        </div>
      </DocHeader>

      <DocSection
        id={HOW_SECTIONS.reasons.id}
        title="Three reasons to ask again, and only the third refuses a yes"
        lead={STANDING_FIELDS_LINE}
      >
        <GateReasons />
      </DocSection>

      <DocSection
        id={HOW_SECTIONS.proof.id}
        title="What counts as proof differs by field"
        lead="Where arithmetic exists, voice is not spent. Where no checksum and no catalogue exist, the spoken confirmation is the only proof there is."
      >
        <ProofLadder />
      </DocSection>

      <DocSection
        id={HOW_SECTIONS.script.id}
        title={`An extended script: ${SCRIPT_STEPS.length} checks a skeptic would run`}
        lead={
          <>
            The <TextLink href="/demo#tour">90-second tour</TextLink> on the replay hub visits
            each surface once. This script is its longer continuation, about seven minutes: it
            adds the checks a skeptic runs, including one the product only partly passes.{" "}
            {MICROPHONE_FREE_STEPS} of these {SCRIPT_STEPS.length} steps need no microphone and
            no second person; the {SCRIPT_STEPS.length - MICROPHONE_FREE_STEPS} that do are
            marked.
          </>
        }
      >
        <DemoScript />
      </DocSection>

      <DocSection
        id={HOW_SECTIONS.attack.id}
        title="Try to write a value the gate did not prove"
        lead="Each button builds a real candidate, runs the real decision function and calls the only constructor that can write a field. Nothing here is staged: the refusal you read is the string the gate raised."
      >
        <AttackConsole />
      </DocSection>

      <DocSection
        id={HOW_SECTIONS.limits.id}
        title="What this does not prove"
        lead="The three limits closest to this page, each stated in full on the limitations page. A demonstration that hides its own boundary is the failure this product argues against."
      >
        <LimitTitles entries={LIMITATIONS.filter((entry) => SHOWN_LIMITS.includes(entry.id))} />
        <div className={styles.actions}>
          <ActionLink href="/docs/limitations" icon="forward">
            {`All ${LIMITATIONS.length} limitations`}
          </ActionLink>
          <ActionLink href="/docs/threat-model" icon="forward">
            Threat model and receipts
          </ActionLink>
        </div>
      </DocSection>
    </>
  )
}
