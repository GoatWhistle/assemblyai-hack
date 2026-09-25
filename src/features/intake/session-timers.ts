export const REPLY_STALL_MS = 20000
export const IDLE_END_MS = 90000

export type ReplyWatchdog = {
  replyStarted: () => void
  replyDone: () => void
  cancel: () => void
}

export function createReplyWatchdog(
  onStall: () => void,
  timeoutMs = REPLY_STALL_MS,
): ReplyWatchdog {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  return {
    replyStarted: () => {
      cancel()
      timer = setTimeout(() => {
        timer = null
        onStall()
      }, timeoutMs)
    },
    replyDone: cancel,
    cancel,
  }
}

export type IdleTimer = {
  activity: () => void
  cancel: () => void
}

export function createIdleTimer(onIdle: () => void, timeoutMs = IDLE_END_MS): IdleTimer {
  let timer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  const arm = () => {
    clear()
    if (cancelled) {
      return
    }
    timer = setTimeout(() => {
      timer = null
      cancelled = true
      onIdle()
    }, timeoutMs)
  }
  arm()
  return {
    activity: arm,
    cancel: () => {
      cancelled = true
      clear()
    },
  }
}
