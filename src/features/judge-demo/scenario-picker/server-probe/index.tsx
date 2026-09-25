import { type EvidenceValue, GateAction } from "@/domain"
import { GateBanner } from "@/features/gate-banner"
import { Chip } from "@/shared/ui/primitives/chip"
import { ErrorState } from "@/shared/ui/states/error-state"
import type { ServerProbe } from "../scenarios"
import type { ServerRunState } from "../server-run"
import styles from "./styles.module.css"

const SERVER_RUNNING_NOTE = "Asking the server to run this scenario"

export const SERVER_FAILED_TITLE = "The server returned no verdict"

export const NO_FALLBACK_NOTE =
  "No verdict is shown in its place. A verdict this page made up would be exactly the substitution the scenario exists to refuse."

function evidenceText(
  value: EvidenceValue | readonly EvidenceValue[] | undefined,
): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }
  return null
}

function failureCode(state: ServerRunState): string | null {
  if (state.phase !== "failed") {
    return null
  }
  return state.status === null ? "no response" : `HTTP ${state.status}`
}

export function ServerRunChip({ state }: { readonly state: ServerRunState }) {
  if (state.phase === "done") {
    const refuses = state.result.decision.action !== GateAction.Accept
    return (
      <Chip tone={refuses ? "lasa" : "accepted"} monospace>
        {state.result.reasonCode}
      </Chip>
    )
  }
  if (state.phase === "failed") {
    return <Chip tone="escalated">{`no verdict, ${failureCode(state)}`}</Chip>
  }
  return <Chip tone="pending">waiting for the server</Chip>
}

export function ServerProbePanel({
  probe,
  state,
}: {
  readonly probe: ServerProbe
  readonly state: ServerRunState
}) {
  if (state.phase === "failed") {
    return (
      <ErrorState
        headingLevel="h3"
        title={SERVER_FAILED_TITLE}
        body={`${state.message}. ${NO_FALLBACK_NOTE}`}
        code={failureCode(state) ?? undefined}
      />
    )
  }
  if (state.phase !== "done") {
    return <output className={styles.running}>{SERVER_RUNNING_NOTE}</output>
  }
  const { decision, reasonCode, sayToCaller } = state.result
  const spoken = evidenceText(decision.evidence.spokenText) ?? probe.spoken
  const proposed =
    evidenceText(decision.evidence.proposedTokens) ??
    evidenceText(decision.evidence.failedValue) ??
    probe.heard
  return (
    <>
      <div className={styles.detail}>
        <dl className={styles.heard}>
          <dt className={styles.heardTerm}>What the turn contained</dt>
          <dd className={styles.heardValue}>{spoken}</dd>
          <dt className={styles.heardTerm}>What the model proposed</dt>
          <dd className={styles.heardValue}>{proposed}</dd>
          <dt className={styles.heardTerm}>Reason code from the server</dt>
          <dd className={styles.heardValue}>{reasonCode}</dd>
          {sayToCaller === null ? null : (
            <>
              <dt className={styles.heardTerm}>What the agent is told to say</dt>
              <dd className={styles.heardValue}>{sayToCaller}</dd>
            </>
          )}
        </dl>
        <p className={styles.why}>{probe.whyThisOne}</p>
      </div>
      <GateBanner decision={decision} />
    </>
  )
}
