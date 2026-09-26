import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export function NotFoundScreen() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the content
      </a>
      <SiteHeader current="order" />
      <main className={styles.page} id={MAIN_ID}>
        <h1 className={styles.title}>There is no page at this address</h1>
        <p className={styles.lead}>
          Nothing was recorded and nothing was ordered. Start a call, watch the replay, or read
          how the check works.
        </p>
        <nav className={styles.links} aria-label="Where to go instead">
          <ActionLink href={CALL_HREF} tone="primary" size="large">
            Start a call
          </ActionLink>
          <ActionLink href={REPLAY_ENTRY_HREF} size="large">
            {`Watch the ${REPLAY_LENGTH_LABEL}`}
          </ActionLink>
          <ActionLink href="/docs" size="large">
            Read the docs
          </ActionLink>
        </nav>
        <Disclaimer />
      </main>
    </div>
  )
}
