import type { DeckSlide } from "../slides"
import styles from "./styles.module.css"

type SlideProps = {
  readonly slide: DeckSlide
  readonly position: number
  readonly total: number
}

export function Slide({ slide, position, total }: SlideProps) {
  const headingId = `slide-${slide.id}`
  const opening = position === 1
  return (
    <section
      className={opening ? `${styles.slide} ${styles.opening}` : styles.slide}
      aria-labelledby={headingId}
    >
      <div className={styles.frame}>
        <header className={styles.top}>
          <span className={styles.brand}>Readback</span>
          <span className={styles.count}>
            {position} / {total}
          </span>
        </header>
        <h2 className={styles.title} id={headingId}>
          {slide.title}
        </h2>
        <div className={styles.body}>
          {slide.body.map((paragraph) => (
            <p className={styles.paragraph} key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
        {slide.source === undefined ? null : (
          <p className={styles.source}>Source: {slide.source}</p>
        )}
      </div>
    </section>
  )
}
