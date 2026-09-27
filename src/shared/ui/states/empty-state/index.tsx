import type { ReactNode } from "react"
import { EmptyMark, type EmptyMarkKind } from "../empty-mark"
import { StateShell } from "../state-shell"

export type EmptyStateProps = {
  readonly glyph?: string
  readonly illustration?: EmptyMarkKind
  readonly title: string
  readonly body: ReactNode
  readonly actions?: ReactNode
  readonly centered?: boolean
}

export function EmptyState({
  glyph = "—",
  illustration,
  title,
  body,
  actions,
  centered,
}: EmptyStateProps) {
  return (
    <StateShell
      glyph={glyph}
      mark={illustration === undefined ? undefined : <EmptyMark kind={illustration} />}
      title={title}
      body={body}
      actions={actions}
      centered={centered}
    />
  )
}
