import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowIcon, DocumentIcon, ExternalIcon } from "@/shared/ui/icons"
import styles from "./styles.module.css"

export const EXTERNAL_REL = "noopener noreferrer"

export const NEW_TAB_NOTE = "(opens in a new tab)"

const TAIL_LIMIT = 24

export type LinkGlyph = "arrow" | "external" | "document"

const GLYPH_MOTION: Readonly<Record<LinkGlyph, string>> = {
  arrow: styles.forward ?? "",
  external: styles.outward ?? "",
  document: "",
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export function glyphFor(href: string): LinkGlyph {
  if (/\.pdf(?:[?#]|$)/i.test(href)) {
    return "document"
  }
  return isExternalHref(href) ? "external" : "arrow"
}

export function LinkGlyphIcon({
  glyph,
  className,
}: {
  readonly glyph: LinkGlyph
  readonly className?: string
}) {
  if (glyph === "document") {
    return <DocumentIcon className={className} />
  }
  if (glyph === "external") {
    return <ExternalIcon className={className} />
  }
  return <ArrowIcon direction="right" className={className} />
}

function withTail(children: ReactNode, badge: ReactNode): ReactNode {
  if (typeof children !== "string") {
    return (
      <>
        {children}
        {badge}
      </>
    )
  }
  const cut = children.lastIndexOf(" ") + 1
  const last = children.slice(cut)
  if (last.length > TAIL_LIMIT) {
    return (
      <>
        {children}
        {badge}
      </>
    )
  }
  return (
    <>
      {children.slice(0, cut)}
      <span className={styles.tail}>
        {last}
        {badge}
      </span>
    </>
  )
}

export type TextLinkProps = {
  readonly href: string
  readonly glyph?: LinkGlyph
  readonly className?: string
  readonly children: ReactNode
}

export function TextLink({ href, glyph = glyphFor(href), className, children }: TextLinkProps) {
  const classes = [styles.link, className ?? ""].filter((value) => value !== "").join(" ")
  const badge = (
    <span className={styles.badge} aria-hidden="true">
      <LinkGlyphIcon glyph={glyph} className={`${styles.glyph} ${GLYPH_MOTION[glyph]}`} />
    </span>
  )
  const body = withTail(children, badge)
  if (isExternalHref(href)) {
    return (
      <a className={classes} data-link="inline" href={href} target="_blank" rel={EXTERNAL_REL}>
        {body}
        <span className="visually-hidden"> {NEW_TAB_NOTE}</span>
      </a>
    )
  }
  return (
    <Link className={classes} data-link="inline" href={href}>
      {body}
    </Link>
  )
}
