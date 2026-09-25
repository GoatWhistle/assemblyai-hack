import type { Metadata } from "next"
import { SLIDES, Slide } from "@/features/deck"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Deck",
  description:
    "The submission slides for Readback, one slide per printed page. Every figure carries the command or document it came from.",
  robots: { index: false },
}

export default function DeckPage() {
  return (
    <main className={styles.deck} id={MAIN_ID}>
      <p className={styles.hint}>
        Print to PDF to get one slide per page: landscape, no margins, background graphics on.
      </p>
      <ol className={styles.slides}>
        {SLIDES.map((slide, index) => (
          <li className={styles.item} key={slide.id}>
            <Slide slide={slide} position={index + 1} total={SLIDES.length} />
          </li>
        ))}
      </ol>
    </main>
  )
}
