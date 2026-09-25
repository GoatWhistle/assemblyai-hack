import type { ReactNode } from "react"
import { StateShell } from "../state-shell"

export type ErrorStateProps = {
  readonly title: string
  readonly body: ReactNode
  readonly actions?: ReactNode
  readonly code?: string
  readonly headingLevel?: "h2" | "h3" | "h4"
}

export function ErrorState({
  title,
  body,
  actions,
  code,
  headingLevel = "h2",
}: ErrorStateProps) {
  return (
    <StateShell
      glyph="!"
      title={title}
      body={body}
      actions={actions}
      alarmed
      headingLevel={headingLevel}
      note={code === undefined ? undefined : `Reported as ${code}.`}
    />
  )
}
