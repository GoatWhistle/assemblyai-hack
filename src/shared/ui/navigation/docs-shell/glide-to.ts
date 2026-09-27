export const GLIDE_MIN_MS = 450

export const GLIDE_MAX_MS = 900

const GLIDE_MS_PER_PX = 0.3

const INTERRUPTIONS = ["wheel", "touchstart", "keydown", "pointerdown"] as const

export function glideDuration(distance: number): number {
  return Math.round(
    Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, 240 + Math.abs(distance) * GLIDE_MS_PER_PX)),
  )
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function glideTop(target: HTMLElement): number {
  const margin = Number.parseFloat(globalThis.getComputedStyle(target).scrollMarginTop) || 0
  const top = target.getBoundingClientRect().top + globalThis.scrollY - margin
  const max = globalThis.document.documentElement.scrollHeight - globalThis.innerHeight
  return Math.max(0, Math.min(top, max))
}

export function glideTo(top: number, done: (completed: boolean) => void): () => void {
  const view = globalThis.window
  const from = view.scrollY
  const distance = top - from
  const duration = glideDuration(distance)
  let frame = 0
  let finished = false
  const detach = () => {
    for (const name of INTERRUPTIONS) {
      view.removeEventListener(name, interrupt)
    }
  }
  const end = (completed: boolean) => {
    if (finished) {
      return
    }
    finished = true
    globalThis.cancelAnimationFrame(frame)
    detach()
    done(completed)
  }
  const interrupt = () => end(false)
  const start = globalThis.performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    view.scrollTo({ top: from + distance * easeInOutCubic(t), behavior: "instant" })
    if (t < 1) {
      frame = globalThis.requestAnimationFrame(step)
    } else {
      end(true)
    }
  }
  for (const name of INTERRUPTIONS) {
    view.addEventListener(name, interrupt, { passive: true })
  }
  frame =
    Math.abs(distance) < 1
      ? globalThis.requestAnimationFrame(() => end(true))
      : globalThis.requestAnimationFrame(step)
  return () => end(false)
}
