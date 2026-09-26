import { Fold } from "../fold"
import styles from "./styles.module.css"

export const REPLAY_NOTICE_TITLE = "Simulated session, not a live call"

export const REPLAY_NOTICE_BODY =
  "Everything below runs on a synthesised session: the candidates and socket frames are built from the documented message shapes, not captured from a live call, and a recorded live session replaces them once one is captured. The gate, the validators and the published pair table are the shipped ones and decide here exactly as they decide on a call; no microphone is open and no audio is being sent to AssemblyAI right now."

export const REPLAY_NOTICE_INSURANCE =
  "This path exists so the demonstration cannot fail: it needs no microphone, no second person on the line and no working network beyond this page. When we checked on 11 September, 12 of the 45 submissions then published had a demo link that did not work."

export function ReplayNotice() {
  return (
    <aside className={styles.notice} aria-label={REPLAY_NOTICE_TITLE}>
      <p className={styles.title}>
        <span className={styles.tag}>replay</span>
        {REPLAY_NOTICE_TITLE}
      </p>
      <p className={styles.body}>{REPLAY_NOTICE_BODY}</p>
      <Fold summary="Why a replay exists at all">
        <p className={styles.insurance}>{REPLAY_NOTICE_INSURANCE}</p>
      </Fold>
    </aside>
  )
}

export const REPLAY_TAG_LINE =
  "A synthesised session decided by the shipped gate. No microphone is open and nothing is sent to AssemblyAI; the full notice follows the replay."

export function ReplayTag() {
  return (
    <p className={styles.title}>
      <span className={styles.tag}>replay</span>
      <span className={styles.tagLine}>{REPLAY_TAG_LINE}</span>
    </p>
  )
}
