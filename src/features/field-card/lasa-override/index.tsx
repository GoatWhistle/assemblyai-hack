import type { LasaRisk } from "@/domain"
import { LASA_NOT_AN_ACCUSATION } from "@/features/gate-banner/hypothesis-language"
import { TextLink } from "@/shared/ui/navigation/text-link"
import { Chip } from "@/shared/ui/primitives/chip"
import type { NameAnswerState } from "../field-status"
import styles from "./styles.module.css"

export const LIST_SOURCE_HREF = "/docs/glossary"

const NAME_HEAD: Readonly<Record<NameAnswerState, string>> = Object.freeze({
  pending: "Needs the name, not a yes",
  "yes-refused": "Needs the name, not a yes",
  named: "Settled by a spoken name",
})

const NAME_BODY: Readonly<Record<NameAnswerState, string>> = Object.freeze({
  pending:
    "A yes does not confirm this field. The caller has to say one of the names aloud; saying a different listed name corrects the value.",
  "yes-refused":
    "The caller answered with a yes, and a yes does not settle which of the look-alike names was meant (E_LASA_NAMED_ANSWER_REQUIRED). The agent asks for the name again.",
  named: "The caller said one of the names aloud, which is the only answer this field accepts.",
})

export type LasaOverrideProps = {
  readonly lasa: LasaRisk
  readonly minConfidence: number
  readonly threshold: number
  readonly nameState?: NameAnswerState
}

export function LasaOverride({
  lasa,
  minConfidence,
  threshold,
  nameState = "pending",
}: LasaOverrideProps) {
  const aboveThreshold = minConfidence >= threshold
  return (
    <div className={styles.override}>
      <p className={styles.overrideHead}>
        <Chip tone="lasa" glyph="?">
          Look-alike pair
        </Chip>
        <span>{NAME_HEAD[nameState]}</span>
      </p>
      <p className={styles.overrideBody}>{NAME_BODY[nameState]}</p>
      <p className={styles.overrideBody}>
        {aboveThreshold
          ? `The recognizer reported ${minConfidence.toFixed(2)} certainty, at or above this field's ${threshold.toFixed(2)} threshold, and that does not settle which name was spoken. Certainty describes the acoustics it received, not which of the listed similar-sounding medicines the caller chose. ${nameState === "named" ? "The published list is why it was written only after the caller said the name." : "The published list is why the value is asked about instead of written."}`
          : `The recognizer reported ${minConfidence.toFixed(2)} certainty, below this field's ${threshold.toFixed(2)} threshold. Even at 1.00 this value would still be confirmed: the name sits on a published list of confused names, and no number resolves which of them was said.`}
      </p>
      <p className={styles.overrideBody}>{LASA_NOT_AN_ACCUSATION}</p>
      <div className={styles.alternatives}>
        <span className={styles.altLabel}>Heard as</span>
        <Chip tone="lasa">{lasa.matchedTerm ?? "unknown"}</Chip>
        <span className={styles.altLabel}>confusable with</span>
        {lasa.confusableWith.map((name) => (
          <Chip key={name} tone="plain">
            {name}
          </Chip>
        ))}
      </div>
      <p className={styles.source}>
        source{" "}
        <TextLink href={LIST_SOURCE_HREF} glyph="document">
          {lasa.source}
        </TextLink>
        {lasa.sourceRow === null ? "" : ` · ${lasa.sourceRow}`}
      </p>
    </div>
  )
}
