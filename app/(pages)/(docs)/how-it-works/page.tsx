import type { Metadata } from "next"
import { AttackConsole } from "@/features/attack-console"
import { DemoScript } from "@/features/how-it-works/demo-script"
import {
  MICROPHONE_FREE_STEPS,
  SCRIPT_STEPS,
} from "@/features/how-it-works/demo-script/script-steps"
import { GateReasons } from "@/features/how-it-works/gate-reasons"
import { Limits } from "@/features/how-it-works/limits"
import { ProofLadder } from "@/features/how-it-works/proof-ladder"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { HOW_SECTIONS } from "../docs-map"
import styles from "./styles.module.css"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The gate that decides whether a spoken value may enter a prescription order: three reasons to ask again, what counts as proof per field, and what the demonstration does not prove.",
}

export default function HowItWorksPage() {
  return (
    <>
      <DocHeader
        title="A value enters the order only after it is proved"
        lede="Read-back is mandatory under ICAO Annex 11 for flight crews and under Joint Commission policy for verbal orders. We automate a step regulation already requires and practice routinely skips."
      >
        <div className={styles.actions}>
          <ActionLink href={REPLAY_ENTRY_HREF} tone="primary" size="large">
            Watch it catch a staged mishearing
          </ActionLink>
          <ActionLink href="/" size="large">
            Take an order
          </ActionLink>
        </div>
      </DocHeader>

      <DocSection
        id={HOW_SECTIONS.reasons.id}
        title="Three reasons the agent asks again"
        lead="Every value passes one decision function before it can enter the order. The three reasons are not interchangeable, and the third is the point of the product."
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
        title="Seven minutes, in order"
        lead={`${MICROPHONE_FREE_STEPS} of these ${SCRIPT_STEPS.length} steps need no microphone and no second person. Two do, and they are marked, so the sequence still finishes on a machine with no input device. Open a step to see what to watch.`}
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
        lead="Stated here rather than left to be discovered. A demonstration that hides its own boundary is the failure mode this product exists to argue against."
      >
        <Limits />
      </DocSection>
    </>
  )
}
