"use client"

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react"

export const GLIDE_KEY_ATTRIBUTE = "data-glide-key"

export const GLIDE_READY_ATTRIBUTE = "data-glide"

const STILL_PX = 0.5

type Box = {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}

export function boxOf(container: HTMLElement, target: HTMLElement): Box {
  const frame = container.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  return {
    top: rect.top - frame.top - container.clientTop + container.scrollTop,
    left: rect.left - frame.left - container.clientLeft + container.scrollLeft,
    width: rect.width,
    height: rect.height,
  }
}

function keyed(container: HTMLElement, key: string): HTMLElement | null {
  const items = container.querySelectorAll<HTMLElement>(`[${GLIDE_KEY_ATTRIBUTE}]`)
  return [...items].find((item) => item.getAttribute(GLIDE_KEY_ATTRIBUTE) === key) ?? null
}

function clipOf(container: HTMLElement, key: string | null): Box | null {
  const target = key === null ? null : keyed(container, key)
  if (target === null) {
    return null
  }
  const box = boxOf(container, target)
  return box.width === 0 && box.height === 0 ? null : box
}

function paintClip(container: HTMLElement, box: Box) {
  const insets = {
    top: box.top,
    left: box.left,
    right: container.clientWidth - box.left - box.width,
    bottom: container.clientHeight - box.top - box.height,
  }
  for (const [side, value] of Object.entries(insets)) {
    container.style.setProperty(`--glide-${side}`, `${value}px`)
  }
}

export function useGlide(
  container: RefObject<HTMLElement | null>,
  active: string | null,
  from: string | null = null,
): void {
  const shown = useRef<string | null>(null)

  useLayoutEffect(() => {
    const element = container.current
    if (element === null) {
      return
    }
    const target = clipOf(element, active)
    if (target === null) {
      element.removeAttribute(GLIDE_READY_ATTRIBUTE)
      shown.current = null
      return
    }
    const origin = shown.current ?? from
    const start = origin === active ? null : clipOf(element, origin)
    const ready = element.hasAttribute(GLIDE_READY_ATTRIBUTE)
    shown.current = active
    if (!ready && start !== null) {
      paintClip(element, start)
      element.setAttribute(GLIDE_READY_ATTRIBUTE, "")
      element.getBoundingClientRect()
    }
    paintClip(element, target)
    element.setAttribute(GLIDE_READY_ATTRIBUTE, "")
  }, [container, active, from])

  useEffect(() => {
    const element = container.current
    if (element === null || typeof globalThis.ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver(() => {
      const box = clipOf(element, shown.current)
      if (box !== null) {
        paintClip(element, box)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [container])
}

type MarkerBox = {
  readonly top: string
  readonly left: string
  readonly width: string
  readonly height: string
}

function px(box: Box): MarkerBox {
  return {
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  }
}

function sameBox(marker: HTMLElement, box: MarkerBox): boolean {
  const style = marker.style
  return (
    style.top === box.top &&
    style.left === box.left &&
    style.width === box.width &&
    style.height === box.height
  )
}

function invert(before: DOMRect, after: DOMRect): string | null {
  if (before.width === 0 || before.height === 0 || after.width === 0 || after.height === 0) {
    return null
  }
  const dx = before.left - after.left
  const dy = before.top - after.top
  const sx = before.width / after.width
  const sy = before.height / after.height
  if (
    Math.abs(dx) < STILL_PX &&
    Math.abs(dy) < STILL_PX &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01
  ) {
    return null
  }
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
}

export function placeMarker(
  container: HTMLElement,
  marker: HTMLElement,
  selector: string,
  glide: boolean,
): void {
  const target = container.querySelector<HTMLElement>(selector)
  if (target === null) {
    container.removeAttribute(GLIDE_READY_ATTRIBUTE)
    return
  }
  const box = px(boxOf(container, target))
  const shown = container.hasAttribute(GLIDE_READY_ATTRIBUTE)
  if (shown && sameBox(marker, box)) {
    return
  }
  const before = shown && glide ? marker.getBoundingClientRect() : null
  marker.style.transition = "none"
  marker.style.transform = ""
  Object.assign(marker.style, box)
  container.setAttribute(GLIDE_READY_ATTRIBUTE, "")
  const from = before === null ? null : invert(before, target.getBoundingClientRect())
  if (from !== null) {
    marker.style.transform = from
    marker.getBoundingClientRect()
  }
  marker.style.transition = ""
  marker.style.transform = ""
}

export function useGlideMarker(
  container: RefObject<HTMLElement | null>,
  marker: RefObject<HTMLElement | null>,
  selector: string,
  key: string | null,
): void {
  useLayoutEffect(() => {
    if (container.current !== null && marker.current !== null && key !== undefined) {
      placeMarker(container.current, marker.current, selector, true)
    }
  }, [container, marker, selector, key])

  useEffect(() => {
    const frame = container.current
    const dot = marker.current
    if (frame === null || dot === null || typeof globalThis.ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver(() => placeMarker(frame, dot, selector, false))
    observer.observe(frame)
    return () => observer.disconnect()
  }, [container, marker, selector])
}
