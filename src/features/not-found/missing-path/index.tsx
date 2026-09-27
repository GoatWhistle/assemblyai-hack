"use client"

import { usePathname } from "next/navigation"
import styles from "./styles.module.css"

export function MissingPath() {
  const pathname = usePathname()
  if (pathname === null || pathname === "") {
    return "Nothing lives at this address."
  }
  return (
    <>
      Nothing lives at <code className={styles.path}>{pathname}</code>.
    </>
  )
}
