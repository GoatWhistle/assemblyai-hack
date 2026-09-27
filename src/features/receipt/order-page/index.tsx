import { PageShell } from "@/shared/ui/layout/page-shell"
import { Breadcrumbs } from "@/shared/ui/navigation/breadcrumbs"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import { OrderCheck } from "../order-check"
import styles from "./styles.module.css"

const MAIN_ID = "main"

const RECOMPUTED: readonly { readonly check: string; readonly meaning: string }[] = [
  {
    check: "sha256",
    meaning: "over the receipt's canonical JSON; one changed character reads TAMPERED",
  },
  { check: "NPI", meaning: "the Luhn check digit over 80840 and the first nine digits" },
  { check: "DEA", meaning: "the mod-10 check digit over the seven digits" },
  {
    check: "Pair rule",
    meaning: "a name on the published look-alike list was confirmed aloud, not by a yes",
  },
  {
    check: "Witness",
    meaning: "the vendor transcript's verdict beside each field, when the receipt carries one",
  },
]

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
          <div className={styles.intro}>
            {sessionId === null ? null : (
              <Breadcrumbs
                trail={[{ href: "/order", label: "Receipts" }]}
                current={`Order ${sessionId}`}
              />
            )}
            <Heading level={1}>Order receipt</Heading>
            <Lede rank="page">
              {sessionId === null
                ? "Choose a receipt file you downloaded after a call. "
                : null}
              Everything here is recomputed in this browser, not taken from the server&rsquo;s
              word: the sha256 over the receipt&rsquo;s canonical JSON, the NPI and DEA check
              digits, and whether a name on a published look-alike list was confirmed aloud.
            </Lede>
          </div>
          <div className={styles.work}>
            <OrderCheck sessionId={sessionId} />
          </div>
          <div className={styles.detail}>
            {sessionId === null ? (
              <dl className={styles.checks} aria-label="What this page recomputes">
                {RECOMPUTED.map((entry) => (
                  <div key={entry.check} className={styles.check}>
                    <dt className={styles.checkName}>{entry.check}</dt>
                    <dd className={styles.checkMeaning}>{entry.meaning}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className={styles.more}>
              <MoreLink href="/docs/threat-model#receipt">How a receipt is sealed</MoreLink>
            </p>
          </div>
        </main>
      </PageShell>
    </>
  )
}
