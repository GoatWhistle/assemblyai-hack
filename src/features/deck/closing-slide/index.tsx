import styles from "./styles.module.css"

const LINKS = [
  {
    label: "Watch the replay",
    href: "https://readback-rx.vercel.app/demo",
  },
  { label: "Call it live", href: "https://readback-rx.vercel.app/" },
  {
    label: "Code and evidence",
    href: "https://github.com/GoatWhistle/assemblyai-hack",
  },
] as const

function shown(href: string): string {
  return href.replace("https://", "").replace(/\/$/, "")
}

export function ClosingSlide() {
  return (
    <div className={styles.layout}>
      <svg
        className={styles.rings}
        viewBox="0 0 1000 1000"
        aria-hidden="true"
        focusable="false"
      >
        <circle className={styles.ringNear} cx="500" cy="500" r="222" />
        <circle className={styles.ringFar} cx="500" cy="500" r="352" />
        <circle className={styles.ringFar} cx="500" cy="500" r="498" />
      </svg>
      <ul className={styles.links}>
        {LINKS.map((link) => (
          <li className={styles.link} key={link.href}>
            <span className={styles.label}>{link.label}</span>
            <a className={styles.href} href={link.href}>
              {shown(link.href)}
            </a>
          </li>
        ))}
      </ul>
      <p className={styles.disclaimer}>
        A technology demonstration, not a medical device. Synthetic data only.
      </p>
    </div>
  )
}
