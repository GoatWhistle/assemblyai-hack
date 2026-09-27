"use client"

import { type KeyboardEvent, type ReactNode, useId, useRef } from "react"
import styles from "./styles.module.css"
import { useAnchoredSelection } from "./use-anchored-selection"

export type TabItem = {
  readonly id: string
  readonly label: ReactNode
  readonly accessibleLabel?: string
  readonly panel: ReactNode
}

export type TabsProps = {
  readonly label: string
  readonly items: readonly TabItem[]
  readonly defaultId?: string
  readonly anchored?: boolean
}

const STEP: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

export function Tabs({ label, items, defaultId, anchored = false }: TabsProps) {
  const base = useId()
  const root = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = useAnchoredSelection(
    items.map((item) => item.id),
    defaultId ?? items[0]?.id ?? "",
    anchored,
    root,
  )
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map())
  const tabId = (id: string) => (anchored ? `${id}-tab` : `${base}-tab-${id}`)
  const panelId = (id: string) => (anchored ? id : `${base}-panel-${id}`)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = STEP[event.key]
    if (move === undefined || items.length === 0) {
      return
    }
    event.preventDefault()
    const index = items.findIndex((item) => item.id === selected)
    const next = items[move(Math.max(index, 0), items.length)]
    if (next === undefined) {
      return
    }
    setSelected(next.id)
    buttons.current.get(next.id)?.focus()
  }

  return (
    <div className={styles.tabs} ref={root}>
      <div className={styles.list} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const active = item.id === selected
          return (
            <button
              key={item.id}
              ref={(element) => {
                if (element === null) {
                  buttons.current.delete(item.id)
                } else {
                  buttons.current.set(item.id, element)
                }
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              className={active ? `${styles.tab} ${styles.selected}` : styles.tab}
              aria-selected={active}
              aria-controls={panelId(item.id)}
              aria-label={item.accessibleLabel}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={panelId(item.id)}
          className={styles.panel}
          aria-labelledby={tabId(item.id)}
          hidden={item.id !== selected}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the WAI-ARIA tabs pattern puts a panel in the tab order so a panel with no focusable content is still reached after its tab
          tabIndex={0}
        >
          {item.panel}
        </div>
      ))}
    </div>
  )
}
