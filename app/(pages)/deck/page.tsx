import type { Metadata } from "next"
import { SLIDES, Slide } from "@/features/deck"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import { pageMetadata } from "@/site/page-metadata"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = pageMetadata({
  title: "Deck",
  description:
    "The submission slides for Readback, one slide per printed page. Every figure carries the command or document it came from.",
  robots: { index: false },
})

export default function DeckPage() {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the slides
      </a>
      <PageShell printDisclaimer={false}>
        <main className={styles.deck} id={MAIN_ID}>
          <div className={styles.head}>
            <Heading level={1}>Readback: the submission deck</Heading>
            <Lede rank="page">
              Print to PDF to get one slide per page: landscape, no margins, background graphics
              on.
            </Lede>
          </div>
          <ol className={styles.slides}>
            {SLIDES.map((slide, index) => (
              <li className={styles.item} key={slide.id}>
                <Slide slide={slide} position={index + 1} total={SLIDES.length} />
              </li>
            ))}
          </ol>
        </main>
      </PageShell>
    </>
  )
}
