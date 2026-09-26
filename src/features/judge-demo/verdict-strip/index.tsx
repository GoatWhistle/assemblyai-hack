import type { CSSProperties } from "react"
import type { DemoPhase } from "../demo-arms"
import { STRIP_ARMS, STRIP_PHASES, type StripLine } from "./strip-lines"
import styles from "./styles.module.css"

export const VERDICT_STRIP_LABEL = "What each arm does with the same words"

export type VerdictStripProps = {
  readonly phase: DemoPhase
}

function Verdict({ line }: { readonly line: StripLine }) {
  const at = line.emphasis === undefined ? -1 : line.text.indexOf(line.emphasis)
  if (line.emphasis === undefined || at < 0) {
    return <span className={styles.verdict}>{line.text}</span>
  }
  return (
    <span className={styles.verdict}>
      {line.text.slice(0, at)}
      <span className={styles.emphasis}>{line.emphasis}</span>
      {line.text.slice(at + line.emphasis.length)}
    </span>
  )
}

export function VerdictStrip({ phase }: VerdictStripProps) {
  return (
    <section className={styles.strip} aria-label={VERDICT_STRIP_LABEL} aria-live="polite">
      {STRIP_ARMS.map((arm, index) => (
        <div
          key={arm.id}
          className={styles.cell}
          data-tone={arm.lines[phase].tone}
          style={{ "--arm": index } as CSSProperties}
        >
          <p className={styles.arm}>
            {arm.title} <span className={styles.tag}>{arm.tag}</span>
          </p>
          <div className={styles.stack}>
            {STRIP_PHASES.map((entry) => {
              const line = arm.lines[entry]
              const current = entry === phase
              return (
                <p
                  key={entry}
                  className={current ? styles.current : styles.variant}
                  aria-hidden={current ? undefined : true}
                  data-tone={line.tone}
                  data-motion="crossfade"
                >
                  <Verdict line={line} />
                  {line.code === null ? null : (
                    <code className={styles.code} data-code={line.code}>
                      {current ? line.code : null}
                    </code>
                  )}
                </p>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
