export type Closable = {
  end: () => Promise<void>
}

export type ExitPathTarget = {
  readonly stt: Closable | null
  readonly agent: Closable | null
}

export type ExitPathOptions = {
  readonly onClosing?: () => void
  readonly onClosed?: () => void
  readonly onError?: (error: unknown) => void
  readonly closeWhenHidden?: boolean
}

export async function closeBothSockets(
  target: ExitPathTarget,
  options: ExitPathOptions = {},
): Promise<void> {
  options.onClosing?.()
  const results = await Promise.allSettled([
    target.agent === null ? Promise.resolve() : target.agent.end(),
    target.stt === null ? Promise.resolve() : target.stt.end(),
  ])
  for (const result of results) {
    if (result.status === "rejected") {
      options.onError?.(result.reason)
    }
  }
  options.onClosed?.()
}

export function installExitPath(
  resolve: () => ExitPathTarget,
  options: ExitPathOptions = {},
): () => void {
  if (typeof globalThis.window === "undefined") {
    return () => undefined
  }
  let fired = false
  const run = () => {
    if (fired) {
      return
    }
    fired = true
    void closeBothSockets(resolve(), options)
  }
  const onPageHide = () => run()
  const onVisibilityChange = () => {
    if (globalThis.document?.visibilityState === "hidden") {
      run()
    }
  }
  globalThis.window.addEventListener("pagehide", onPageHide)
  if (options.closeWhenHidden === true) {
    globalThis.document?.addEventListener("visibilitychange", onVisibilityChange)
  }
  return () => {
    globalThis.window.removeEventListener("pagehide", onPageHide)
    globalThis.document?.removeEventListener("visibilitychange", onVisibilityChange)
  }
}
