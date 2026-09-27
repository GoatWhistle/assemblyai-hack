import styles from "./styles.module.css"

export const TOUCH_CANCEL_HINT = "Tap the button again to cancel"

export type KeyHintProps = {
  readonly cancellable: boolean
}

export function KeyHint({ cancellable }: KeyHintProps) {
  return cancellable ? <p className={styles.touchHint}>{TOUCH_CANCEL_HINT}</p> : null
}
