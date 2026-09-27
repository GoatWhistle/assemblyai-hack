import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import { PageShell } from "@/shared/ui/layout/page-shell"
import type { DocsPage } from "@/shared/ui/navigation/docs-tree"
import { PageDirectory } from "@/shared/ui/navigation/page-directory"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { MissingPath } from "./missing-path"
import styles from "./styles.module.css"

const MAIN_ID = "main"

const DIRECTORY_ID = "not-found-directory"

function destination(href: string, label: string, summary: string): DocsPage {
  return Object.freeze({ href, label, title: label, summary, sections: [] })
}

export const NOT_FOUND_DESTINATIONS: readonly DocsPage[] = Object.freeze([
  destination(
    "/how-it-works",
    "How it works",
    "When the agent asks again, and what counts as proof for each field.",
  ),
  destination(
    "/compare",
    "Compare",
    "Six moments decided by the gate, beside what a threshold alone would write.",
  ),
  destination(
    "/metrics",
    "Measurements",
    "What the pair rule catches beside what it costs, each with its command.",
  ),
  destination("/order", "Check a receipt", "Recheck a downloaded receipt file in the browser."),
])

export function NotFoundScreen() {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the content
      </a>
      <PageShell>
        <main className={styles.page} id={MAIN_ID}>
          <div className={styles.intro}>
            <h1 className={styles.title}>There is no page at this address</h1>
            <p className={styles.lead}>
              <MissingPath /> Nothing was recorded and nothing was ordered. Start a call, watch
              the replay, or read how the check works.
            </p>
          </div>
          <nav className={styles.links} aria-label="Where to go instead">
            <ActionLink href={CALL_HREF} tone="primary" size="large">
              Start a call
            </ActionLink>
            <ActionLink href={REPLAY_ENTRY_HREF} size="large">
              {`Watch the ${REPLAY_LENGTH_LABEL}`}
            </ActionLink>
            <ActionLink href="/docs" size="large" tone="quiet" icon="forward">
              Read the docs
            </ActionLink>
          </nav>
          <section className={styles.directory} aria-labelledby={DIRECTORY_ID}>
            <h2 className={styles.subtitle} id={DIRECTORY_ID}>
              Or go straight to a page
            </h2>
            <PageDirectory pages={NOT_FOUND_DESTINATIONS} />
          </section>
          <Disclaimer />
        </main>
      </PageShell>
    </>
  )
}
