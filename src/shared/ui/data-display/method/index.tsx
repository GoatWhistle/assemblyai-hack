import type { ReactNode } from "react"
import { Command } from "@/shared/ui/data-display/command"
import styles from "./styles.module.css"

export type MethodProps = {
  readonly command: string
  readonly n?: number | string | null
  readonly set?: ReactNode
}

export function sizeLabel(n: number | string): string {
  return `n = ${n}`
}

export function Method({ command, n = null, set }: MethodProps) {
  return (
    <span className={styles.method} data-method="">
      <Command value={command} />
      {n === null ? null : (
        <>
          {" "}
          <span className={styles.size} data-size="">
            {sizeLabel(n)}
          </span>
        </>
      )}
      {set === undefined ? null : <>, {set}</>}
    </span>
  )
}
