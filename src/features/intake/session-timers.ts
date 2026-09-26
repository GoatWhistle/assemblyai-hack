export const REPLY_STALL_MS = 20000
export const IDLE_END_MS = 90000
export const CONNECT_WINDOW_MS = 15000

export class ConnectTimedOut extends Error {
  constructor(readonly afterMs: number) {
    super(`the line did not open within ${afterMs / 1000} seconds`)
    this.name = "ConnectTimedOut"
  }
}

export function connectWithin<T>(
  pending: Promise<T>,
  windowMs = CONNECT_WINDOW_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ConnectTimedOut(windowMs)), windowMs)
  })
  return Promise.race([pending, expiry]).finally(() => {
    if (timer !== null) {
      clearTimeout(timer)
    }
  })
}

export type ReplyWatchdog = {
  replyStarted: () => void
  replyProgress: () => void
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
  const arm = () => {
    cancel()
    timer = setTimeout(() => {
      timer = null
      onStall()
    }, timeoutMs)
  }
  return {
    replyStarted: arm,
    replyProgress: () => {
      if (timer !== null) {
        arm()
      }
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
