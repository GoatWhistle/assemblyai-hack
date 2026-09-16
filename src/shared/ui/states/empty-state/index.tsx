import type { ReactNode } from "react"
import { StateShell } from "../state-shell"

export type EmptyStateProps = {
  readonly glyph?: string
  readonly title: string
  readonly body: ReactNode
  readonly actions?: ReactNode
  readonly centered?: boolean
}

export function EmptyState({ glyph = "—", title, body, actions, centered }: EmptyStateProps) {
  return (
    <StateShell glyph={glyph} title={title} body={body} actions={actions} centered={centered} />
  )
}
