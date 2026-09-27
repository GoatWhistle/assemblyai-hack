import { PageShell } from "@/shared/ui/layout/page-shell"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { OrderCheck } from "../order-check"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export type OrderPageViewProps = {
  readonly sessionId: string | null
}

export function OrderPageView({ sessionId }: OrderPageViewProps) {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the receipt
      </a>
      <PageShell current="order">
        <main className={styles.page} id={MAIN_ID} tabIndex={-1}>
          <h1 className={styles.title}>Order receipt</h1>
          <p className={styles.lede}>
            {sessionId === null ? "Choose a receipt file you downloaded after a call. " : null}
            Everything below is recomputed in this browser, not taken from the server&rsquo;s
            word: the sha256 over the receipt&rsquo;s canonical JSON, the NPI and DEA check
            digits, and whether a name on a published look-alike list was confirmed aloud.
          </p>
          <OrderCheck sessionId={sessionId} />
          <Disclaimer />
        </main>
      </PageShell>
    </>
  )
}
