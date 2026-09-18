import { useEffect } from "react"

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/
const ACTIVATES_ON_SPACE = 'button, a[href], [role="button"], [role="switch"], summary'
const DIALOG = '[role="dialog"], dialog[open]'

export const MicKeyAction = {
  Ignore: "ignore",
  Start: "start",
  Stop: "stop",
} as const

export type MicKeyAction = (typeof MicKeyAction)[keyof typeof MicKeyAction]

export type MicKeyState = {
  readonly busy: boolean
  readonly open: boolean
}

export type MicKeyOptions = MicKeyState & {
  readonly onStart?: () => void
  readonly onStop?: () => void
}

function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return EDITABLE.test(target.tagName) || target.isContentEditable
}

export function ownsSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.closest(ACTIVATES_ON_SPACE) !== null
}

export function insideDialog(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.closest(DIALOG) !== null
}

export function micKeyAction(
  key: string,
  code: string,
  { busy, open }: MicKeyState,
): MicKeyAction {
  if (key === "Escape") {
    return open ? MicKeyAction.Stop : MicKeyAction.Ignore
  }
  if (code !== "Space" || busy) {
    return MicKeyAction.Ignore
  }
  return open ? MicKeyAction.Stop : MicKeyAction.Start
}

export function useMicKeys({ busy, open, onStart, onStop }: MicKeyOptions): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isEditing(event.target)) {
        return
      }
      if (event.code === "Space" && ownsSpace(event.target)) {
        return
      }
      if (event.key === "Escape" && insideDialog(event.target)) {
        return
      }
      const action = micKeyAction(event.key, event.code, { busy, open })
      if (action === MicKeyAction.Ignore) {
        return
      }
      if (event.code === "Space") {
        event.preventDefault()
      }
      if (action === MicKeyAction.Stop) {
        onStop?.()
        return
      }
      onStart?.()
    }
    globalThis.window?.addEventListener("keydown", onKey)
    return () => globalThis.window?.removeEventListener("keydown", onKey)
  }, [busy, open, onStart, onStop])
}
