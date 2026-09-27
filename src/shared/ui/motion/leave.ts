import { motionMs, motionToken } from "./motion-tokens"
import { readReducedMotion } from "./use-reduced-motion"

export function leave(
  element: HTMLElement | null,
  done: (exit?: Animation) => void,
): (() => void) | undefined {
  const duration = motionMs("--dur-instant")
  if (
    element === null ||
    typeof element.animate !== "function" ||
    readReducedMotion() ||
    duration <= 1
  ) {
    done()
    return undefined
  }
  const exit = element.animate(
    { opacity: [1, 0], transform: ["none", "translateY(-3px)"] },
    { duration, easing: motionToken("--ease-out-quart") || "ease-out", fill: "forwards" },
  )
  exit.onfinish = () => done(exit)
  return () => {
    exit.onfinish = null
  }
}
