"use client"

import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { leave } from "../leave"
import styles from "./styles.module.css"

export type SwapProps = {
  readonly swapKey: string
  readonly className?: string
  readonly children?: ReactNode
}

export function Swap({ swapKey, className, children }: SwapProps) {
  const [shownKey, setShownKey] = useState(swapKey)
  const [swapped, setSwapped] = useState(false)
  const held = useRef<ReactNode>(children)
  const element = useRef<HTMLDivElement | null>(null)
  const current = swapKey === shownKey

  useLayoutEffect(() => {
    if (current) {
      held.current = children
    }
  })

  useLayoutEffect(() => {
    if (current) {
      return undefined
    }
    return leave(element.current, () => {
      setShownKey(swapKey)
      setSwapped(true)
    })
  }, [current, swapKey])

  const content = current ? children : held.current
  if (content === null || content === undefined || content === false) {
    return null
  }
  const classes = [className, swapped ? styles.enter : undefined].filter(Boolean).join(" ")
  return (
    <div key={shownKey} ref={element} className={classes === "" ? undefined : classes}>
      {content}
    </div>
  )
}
