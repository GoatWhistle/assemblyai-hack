import type { ReactNode } from "react"
import { StateShell } from "../state-shell"

export type ErrorStateProps = {
  readonly title: string
  readonly body: ReactNode
  readonly actions?: ReactNode
  readonly code?: string
}

export function ErrorState({ title, body, actions, code }: ErrorStateProps) {
  return (
    <StateShell
      glyph="!"
      title={title}
      body={body}
      actions={actions}
      alarmed
      note={code === undefined ? undefined : `Reported as ${code}.`}
    />
  )
}
