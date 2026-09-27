import { useId } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import { ArrowIcon } from "@/shared/ui/icons"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { Panel } from "@/shared/ui/primitives/panel"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { CALL_SCRIPT, fillLabel, type ScriptLine, spokenLine } from "./call-script"
import styles from "./styles.module.css"

export { CALL_EXAMPLE_DRUG, CALL_EXAMPLE_NPI_DIGITS, CALL_EXAMPLES } from "./call-script"

export const INTAKE_HINT =
  "Say the patient's name, the drug and its strength, how to take it, and the prescriber's NPI. Anything that cannot be proved is asked again."

export const JUDGE_LINK_LABEL = `Judging? Watch the ${REPLAY_LENGTH_LABEL}`

function VoiceGlyph() {
  return (
    <span className={styles.voice} aria-hidden="true">
      <svg
        className={styles.voiceGlyph}
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2.5 7v2M5.25 5v6M8 2.5v11M10.75 5v6M13.5 7v2" />
      </svg>
    </span>
  )
}

function Said({ line }: { readonly line: ScriptLine }) {
  return (
    <p className={styles.quote} data-spoken={spokenLine(line)}>
      &ldquo;
      {line.parts.map((part) =>
        part.value === true ? (
          <mark key={part.text} className={styles.value}>
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
      &rdquo;
    </p>
  )
}

function Fills({ line }: { readonly line: ScriptLine }) {
  return (
    <p className={styles.fills}>
      <ArrowIcon direction="right" className={styles.fillsArrow} />
      <span className={styles.tags}>
        <span className="visually-hidden">Fills </span>
        {line.fills.map((field) => (
          <StatusChip key={field} status="tag">
            {fillLabel(field)}
          </StatusChip>
        ))}
        {line.reads === undefined ? null : (
          <>
            <span className="visually-hidden">, read as </span>
            <StatusChip status="tag" code>
              {line.reads}
            </StatusChip>
          </>
        )}
      </span>
    </p>
  )
}

export function IntakePrompt() {
  const examplesId = useId()
  return (
    <section className={styles.prompt} aria-label="What to say">
      <p className={styles.promptBody}>{INTAKE_HINT}</p>
      <div className={styles.script}>
        <Panel as="div" padding="none">
          <p className={styles.caption} id={examplesId}>
            For example
          </p>
          <ol className={styles.lines} aria-labelledby={examplesId}>
            {CALL_SCRIPT.map((line) => (
              <li key={spokenLine(line)} className={styles.line}>
                <VoiceGlyph />
                <div className={styles.said}>
                  <Said line={line} />
                  <Fills line={line} />
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <p className={styles.judge}>
        <MoreLink href={REPLAY_ENTRY_HREF}>{JUDGE_LINK_LABEL}</MoreLink>
      </p>
    </section>
  )
}
