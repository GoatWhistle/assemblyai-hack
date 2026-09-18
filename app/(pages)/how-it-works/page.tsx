import type { Metadata } from "next"
import { AttackConsole } from "@/features/attack-console"
import { DemoScript } from "@/features/how-it-works/demo-script"
import { GateReasons } from "@/features/how-it-works/gate-reasons"
import { Limits } from "@/features/how-it-works/limits"
import { ProofLadder } from "@/features/how-it-works/proof-ladder"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The gate that decides whether a spoken value may enter a prescription order: three reasons to ask again, what counts as proof per field, and what the demonstration does not prove.",
}

export default function HowItWorksPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader current="how" />
      <main className={styles.page} id={MAIN_ID}>
        <section className={styles.hero}>
          <h1 className={styles.heading}>A value enters the order only after it is proved</h1>
          <p className={styles.lede}>
            Read-back is mandatory under ICAO Annex 11 for flight crews and under Joint
            Commission policy for verbal orders. We automate a step regulation already requires
            and practice routinely skips.
          </p>
          <div className={styles.actions}>
            <ActionLink href="/demo" tone="primary" size="large">
              Watch it catch a mishearing
            </ActionLink>
            <ActionLink href="/" size="large">
              Take an order
            </ActionLink>
          </div>
        </section>

        <GateReasons />
        <DemoScript />
        <AttackConsole />
        <ProofLadder />
        <Limits />
        <Disclaimer />
      </main>
    </div>
  )
}
