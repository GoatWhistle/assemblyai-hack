"use client"

import { type KeyboardEvent as ReactKeyboardEvent, useId, useRef, useState } from "react"
import { Counted } from "@/shared/ui/data-display/counted"
import { Chip } from "@/shared/ui/primitives/chip"
import {
  CIRCULARITY,
  COMPETITOR_CITATION,
  COMPETITOR_PROMPT_LINE,
  isTabArrowKey,
  KEYTERMS_AB_LEDE,
  KEYTERMS_AB_TITLE,
  KEYTERMS_ARMS,
  type KeytermsArmId,
  keytermsArmFor,
  MEASURED_ARM_NOTE,
  NO_MICROPHONE_NOTE,
  nextTabIndex,
  WHY_NO_NUMBER,
} from "./arms"
import styles from "./styles.module.css"

export * from "./arms"

export function KeytermsAb() {
  const [selected, setSelected] = useState<KeytermsArmId>("shipped")
  const arm = keytermsArmFor(selected)
  const titleId = useId()
  const panelId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isTabArrowKey(event.key)) {
      return
    }
    event.preventDefault()
    const nextIndex = nextTabIndex(index, event.key, KEYTERMS_ARMS.length)
    const nextArm = KEYTERMS_ARMS[nextIndex]
    if (nextArm === undefined) {
      return
    }
    setSelected(nextArm.id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <header className={styles.head}>
        <h2 className={styles.title} id={titleId}>
          {KEYTERMS_AB_TITLE}
        </h2>
        <p className={styles.lede}>{KEYTERMS_AB_LEDE}</p>
      </header>

      <div className={styles.switcher} role="tablist" aria-label="Keyterms configuration">
        {KEYTERMS_ARMS.map((entry, index) => {
          const active = entry.id === selected
          return (
            <button
              key={entry.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${titleId}-${entry.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              className={[styles.arm, active ? styles.armActive : ""]
                .filter((value) => value !== "")
                .join(" ")}
              onClick={() => setSelected(entry.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className={styles.armTitle}>{entry.title}</span>
              <span className={styles.armTag}>
                {entry.runnable ? (
                  <Chip tone="accepted">shipped and measured</Chip>
                ) : (
                  <Chip tone="escalated">described, never run</Chip>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div
        key={selected}
        className={styles.panel}
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${titleId}-${selected}`}
      >
        <div className={styles.listBlock}>
          <p className={styles.listLabel}>{arm.listLabel}</p>
          <ul className={styles.sample}>
            {arm.sample.map((term) => (
              <li className={styles.term} key={term}>
                <code className={styles.termText}>{term}</code>
              </li>
            ))}
          </ul>
          <div className={styles.readings}>
            <Counted
              count={arm.runnable ? arm.termCount : null}
              label={
                arm.runnable
                  ? "terms in the list this deployment sends"
                  : "terms in a list this deployment will not send"
              }
              absenceNote={WHY_NO_NUMBER}
            />
            <Counted
              count={arm.lasaTermsPresent.length}
              label="of those terms sit on the published pair table"
              absenceNote={WHY_NO_NUMBER}
              tone={arm.lasaTermsPresent.length === 0 ? "accepted" : "lasa"}
            />
          </div>
          {arm.lasaTermsPresent.length === 0 ? null : (
            <p className={styles.leaked}>
              Pair members in this list:{" "}
              {arm.lasaTermsPresent.map((term) => (
                <code className={styles.leakedTerm} key={term}>
                  {term}
                </code>
              ))}
            </p>
          )}
        </div>

        <dl className={styles.effects}>
          <dt className={styles.effectTerm}>What the recognizer is pushed toward</dt>
          <dd className={styles.effectBody}>{arm.pushedToward}</dd>
          <dt className={styles.effectTerm}>What a read-back then proves</dt>
          <dd className={styles.effectBody}>{arm.readBackThenProves}</dd>
        </dl>

        {arm.runnable ? (
          <p className={styles.measured}>{MEASURED_ARM_NOTE}</p>
        ) : (
          <div className={styles.refusal}>
            <p className={styles.refusalTitle}>Why this arm has no switch</p>
            <p className={styles.refusalBody}>{arm.whyNotRunnable}</p>
            <p className={styles.refusalBody}>
              The prompt that travels with it reads{" "}
              <q className={styles.quote}>{COMPETITOR_PROMPT_LINE}</q>. {COMPETITOR_CITATION}
            </p>
          </div>
        )}
      </div>

      <p className={styles.circularity}>{CIRCULARITY}</p>
      <p className={styles.cost}>{NO_MICROPHONE_NOTE}</p>
    </section>
  )
}
