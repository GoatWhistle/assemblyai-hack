import { Wordmark } from "@/shared/ui/primitives/wordmark"
import type { DeckSlide } from "../slides"
import styles from "./styles.module.css"

type SlideProps = {
  readonly slide: DeckSlide
  readonly position: number
  readonly total: number
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0")
}

function classesFor(slide: DeckSlide): string {
  return [
    styles.slide,
    slide.tone === "violet" ? styles.violet : "",
    slide.hero ? styles.heroSlide : "",
  ]
    .join(" ")
    .trim()
}

export function Slide({ slide, position, total }: SlideProps) {
  const headingId = `slide-${slide.id}`
  const Body = slide.body
  const numbered = position !== 1 && position !== total
  if (slide.cover) {
    return (
      <section className={classesFor(slide)} aria-labelledby={headingId}>
        <div className={styles.coverFrame}>
          <h2 className={styles.coverName} id={headingId}>
            {slide.title}
          </h2>
          <Body />
        </div>
      </section>
    )
  }
  return (
    <section className={classesFor(slide)} aria-labelledby={headingId}>
      <div className={styles.frame}>
        {slide.hero ? (
          <header className={styles.lockup}>
            <Wordmark size={96} />
            Readback
          </header>
        ) : (
          <span className={styles.mark} aria-hidden="true">
            <Wordmark size={32} />
          </span>
        )}
        <h2 className={styles.title} id={headingId}>
          {slide.title}
        </h2>
        <div className={styles.body}>
          <Body />
        </div>
        <footer className={styles.foot}>
          {numbered ? (
            <span className={styles.count} data-slide-count="">
              {twoDigits(position)} / {twoDigits(total)}
            </span>
          ) : null}
        </footer>
      </div>
    </section>
  )
}
