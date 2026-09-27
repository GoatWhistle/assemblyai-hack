import { Table } from "@/shared/ui/data-display/table"
import { MOMENT_COLUMNS, momentCells } from ".."
import type { Moment } from "../moments"

export type MomentStripProps = {
  readonly moment: Moment
}

export function MomentStrip({ moment }: MomentStripProps) {
  return (
    <Table
      label={moment.title}
      caption={moment.title}
      columns={MOMENT_COLUMNS}
      rows={[{ key: moment.id, cells: momentCells(moment) }]}
    />
  )
}
