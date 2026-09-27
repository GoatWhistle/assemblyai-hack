"use client"

import { useSyncExternalStore } from "react"
import { type GateDecision, LatencyInterval } from "@/domain"
import { PHASE_TECHNICAL, type SessionPhase } from "@/features/intake/session-status"
import type { LatencySummary } from "@/features/latency/latency-recorder"
import type { TappedFrame } from "@/realtime/frame-tap"
import { useDetailsMotion } from "@/shared/ui/motion/use-details-motion"
import { Chip } from "@/shared/ui/primitives/chip"
import { ACTIVITY_LABEL, ACTIVITY_WORD, agentActivityOf } from "../agent-activity"
import type { DecisionCounts } from "../decision-counts"
import { DecisionLog } from "../decision-log"
import { FrameFeed } from "../frame-feed"
import type { FrameLog } from "../frame-log"
import { LatencyChip } from "../latency-chip"
import { modeLabel, type SessionMode } from "../session-mode"
import styles from "./styles.module.css"

const NO_FRAMES: readonly TappedFrame[] = []

const LATENCY_LABEL: Readonly<Record<LatencyInterval, string>> = Object.freeze({
  [LatencyInterval.TurnToDecision]: "end of turn → gate decision on screen",
  [LatencyInterval.TurnToAudio]: "end of turn → first agent audio",
  [LatencyInterval.DecisionToAudio]: "gate decision on screen → first agent audio",
})

export type TelemetryPanelProps = {
  readonly mode: SessionMode
  readonly phase: SessionPhase
  readonly sttModel: string | null
  readonly sessionId: string | null
  readonly log: FrameLog
  readonly counts: DecisionCounts
  readonly decisions: readonly GateDecision[]
  readonly latency: readonly LatencySummary[]
}

export function TelemetryPanel({
  mode,
  phase,
  sttModel,
  sessionId,
  log,
  counts,
  decisions,
  latency,
}: TelemetryPanelProps) {
  const frames = useSyncExternalStore(log.subscribe, log.snapshot, () => NO_FRAMES)
  const activity = agentActivityOf(frames)
  const frameDetails = useDetailsMotion()
  return (
    <section className={styles.panel} aria-label="Telemetry">
      <div className={styles.status}>
        <Chip tone={mode.kind === "live" ? "pending" : "plain"}>{modeLabel(mode)}</Chip>
        <output className={styles.activity} aria-live="polite">
          <span className={styles.activityWord}>{ACTIVITY_WORD[activity]}</span>
          <span className={styles.activityNote}>{ACTIVITY_LABEL[activity]}</span>
        </output>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Sockets</dt>
          <dd>{PHASE_TECHNICAL[phase]}</dd>
        </div>
        <div>
          <dt>Recognizer model, from the session's Begin message</dt>
          <dd>{sttModel ?? "not reported yet"}</dd>
        </div>
        <div>
          <dt>Session issued by the server</dt>
          <dd className={styles.mono}>{sessionId ?? "not bound yet"}</dd>
        </div>
      </dl>
      <p className={styles.counts}>
        <span>
          <strong>{counts.proposed}</strong> proposed
        </span>
        <span>
          <strong>{counts.confirmed}</strong> confirmed
        </span>
        <span>
          <strong>{counts.refused}</strong> refused or re-asked
        </span>
      </p>
      <div className={styles.latency}>
        <p className={styles.heading}>Latency measured in this browser</p>
        {latency.map((summary) => (
          <LatencyChip
            key={summary.interval}
            label={LATENCY_LABEL[summary.interval]}
            summary={summary}
          />
        ))}
      </div>
      <div className={styles.block}>
        <p className={styles.heading}>Decision log</p>
        <DecisionLog decisions={decisions} />
      </div>
      <details className={styles.block} ref={frameDetails}>
        <summary className={styles.summary}>Socket frames</summary>
        <FrameFeed log={log} />
      </details>
    </section>
  )
}
