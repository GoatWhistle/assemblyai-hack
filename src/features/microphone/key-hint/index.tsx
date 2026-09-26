import styles from "./styles.module.css"

export const TOUCH_CANCEL_HINT = "Tap the button again to cancel"

export type KeyHintProps = {
  readonly keyName: string | null
  readonly verb: string | null
  readonly cancellable: boolean
}

export function KeyHint({ keyName, verb, cancellable }: KeyHintProps) {
  return (
    <>
      {keyName === null || verb === null ? null : (
        <p className={styles.keys}>
          <kbd className={styles.kbd}>{keyName}</kbd>
          <span>{verb}</span>
        </p>
      )}
      {cancellable ? <p className={styles.touchHint}>{TOUCH_CANCEL_HINT}</p> : null}
    </>
  )
}
