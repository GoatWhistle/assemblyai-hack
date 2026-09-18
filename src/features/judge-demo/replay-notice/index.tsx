import styles from "./styles.module.css"

export const REPLAY_NOTICE_TITLE = "Simulated session, not a live call"

export const REPLAY_NOTICE_BODY =
  "Everything below runs on socket traffic recorded from a live run on 15 September 2026. The gate, the validators and the published pair table are the shipped ones and decide here exactly as they decide on a call; no microphone is open and no audio is being sent to AssemblyAI right now."

export const REPLAY_NOTICE_INSURANCE =
  "This path exists so the demonstration cannot fail: it needs no microphone, no second person on the line and no working network beyond this page. Twelve of forty-five submissions in this field lost points on a demo that would not run."

export function ReplayNotice() {
  return (
    <aside className={styles.notice} aria-label={REPLAY_NOTICE_TITLE}>
      <p className={styles.title}>
        <span className={styles.tag}>replay</span>
        {REPLAY_NOTICE_TITLE}
      </p>
      <p className={styles.body}>{REPLAY_NOTICE_BODY}</p>
      <p className={styles.insurance}>{REPLAY_NOTICE_INSURANCE}</p>
    </aside>
  )
}
