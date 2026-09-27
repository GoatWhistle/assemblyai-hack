import Link from "next/link"
import type { ReactNode } from "react"
import {
  EXTERNAL_REL,
  glyphFor,
  isExternalHref,
  LinkGlyphIcon,
  NEW_TAB_NOTE,
} from "@/shared/ui/navigation/text-link"
import styles from "./styles.module.css"

export type MoreLinkProps = {
  readonly href: string
  readonly children: ReactNode
}

export function MoreLink({ href, children }: MoreLinkProps) {
  const glyph = glyphFor(href)
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      <span className={styles.badge} aria-hidden="true">
        <LinkGlyphIcon
          glyph={glyph}
          className={glyph === "arrow" ? `${styles.glyph} ${styles.forward}` : styles.glyph}
        />
      </span>
    </>
  )
  if (isExternalHref(href)) {
    return (
      <a
        className={styles.more}
        data-link="more"
        href={href}
        target="_blank"
        rel={EXTERNAL_REL}
      >
        {inner}
        <span className="visually-hidden"> {NEW_TAB_NOTE}</span>
      </a>
    )
  }
  return (
    <Link className={styles.more} data-link="more" href={href}>
      {inner}
    </Link>
  )
}
