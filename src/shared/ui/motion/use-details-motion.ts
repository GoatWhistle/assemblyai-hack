"use client"

import { type RefObject, useEffect, useRef } from "react"
import { motionMs, motionToken } from "./motion-tokens"
import { readReducedMotion } from "./use-reduced-motion"

export const CLOSING_ATTRIBUTE = "data-closing"

type Motion = {
  readonly frame: Animation
  readonly opening: boolean
}

function closedHeight(details: HTMLDetailsElement, summary: HTMLElement): number {
  const style = globalThis.getComputedStyle(details)
  const edges = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"] as const
  return edges.reduce(
    (sum, edge) => sum + (Number.parseFloat(style[edge]) || 0),
    summary.getBoundingClientRect().height,
  )
}

function contentOf(details: HTMLDetailsElement): HTMLElement[] {
  return [...details.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName !== "SUMMARY",
  )
}

function still(details: HTMLDetailsElement) {
  for (const child of contentOf(details)) {
    for (const animation of child.getAnimations?.() ?? []) {
      animation.cancel()
    }
  }
}

function settle(details: HTMLDetailsElement) {
  details.style.removeProperty("overflow")
  details.removeAttribute(CLOSING_ATTRIBUTE)
}

function targetHeight(details: HTMLDetailsElement, summary: HTMLElement, opening: boolean) {
  if (opening) {
    details.removeAttribute(CLOSING_ATTRIBUTE)
    details.open = true
    return details.getBoundingClientRect().height
  }
  details.setAttribute(CLOSING_ATTRIBUTE, "")
  return closedHeight(details, summary)
}

function run(
  details: HTMLDetailsElement,
  summary: HTMLElement,
  opening: boolean,
  from: number,
): Animation {
  still(details)
  details.style.overflow = "clip"
  const to = targetHeight(details, summary, opening)
  const easing = motionToken("--ease-out-quart") || "ease-out"
  const duration = opening ? motionMs("--dur-slow") : motionMs("--dur-base")
  const timing = { duration, easing }
  for (const child of contentOf(details)) {
    child.animate(
      opening
        ? { opacity: [0, 1], transform: ["translateY(-4px)", "none"] }
        : { opacity: [1, 0], transform: ["none", "translateY(-4px)"] },
      { ...timing, fill: opening ? "none" : "forwards" },
    )
  }
  const frame = details.animate({ height: [`${from}px`, `${to}px`] }, timing)
  frame.onfinish = () => {
    if (!opening) {
      details.open = false
      still(details)
    }
    settle(details)
  }
  return frame
}

function ownSummary(
  details: HTMLDetailsElement,
  target: EventTarget | null,
): HTMLElement | null {
  const summary = target instanceof Element ? target.closest("summary") : null
  return summary instanceof HTMLElement && summary.parentElement === details ? summary : null
}

export function useDetailsMotion(): RefObject<HTMLDetailsElement | null> {
  const ref = useRef<HTMLDetailsElement | null>(null)

  useEffect(() => {
    const details = ref.current
    if (details === null || typeof details.animate !== "function") {
      return
    }
    let motion: Motion | null = null
    const onClick = (event: globalThis.MouseEvent) => {
      const summary = ownSummary(details, event.target)
      if (summary === null || readReducedMotion() || motionMs("--dur-slow") <= 1) {
        return
      }
      event.preventDefault()
      const running = motion
      const opening = running === null ? !details.open : !running.opening
      const from = details.getBoundingClientRect().height
      if (running !== null) {
        running.frame.onfinish = null
        running.frame.cancel()
      }
      const frame = run(details, summary, opening, from)
      const current = { frame, opening }
      motion = current
      frame.addEventListener("finish", () => {
        if (motion === current) {
          motion = null
        }
      })
    }
    details.addEventListener("click", onClick)
    return () => {
      details.removeEventListener("click", onClick)
    }
  }, [])

  return ref
}
