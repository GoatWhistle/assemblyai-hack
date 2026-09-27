import type { ReactNode } from "react"
import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"

export type Status =
  | "written"
  | "asking"
  | "pair"
  | "refused"
  | "alert"
  | "pending"
  | "inactive"
  | "tag"

export const STATUS_TONE: Readonly<Record<Status, ChipTone>> = Object.freeze({
  written: "accepted",
  asking: "asking",
  pair: "lasa",
  refused: "validator",
  alert: "escalated",
  pending: "pending",
  inactive: "aborted",
  tag: "plain",
})

export type StatusChipProps = {
  readonly status: Status
  readonly code?: boolean
  readonly title?: string
  readonly children: ReactNode
}

export function StatusChip({ status, code = false, title, children }: StatusChipProps) {
  return (
    <Chip tone={STATUS_TONE[status]} monospace={code} title={title}>
      {children}
    </Chip>
  )
}
