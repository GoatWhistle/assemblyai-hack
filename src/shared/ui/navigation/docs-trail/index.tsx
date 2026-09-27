"use client"

import { usePathname } from "next/navigation"
import { createContext, type ReactNode, useContext } from "react"
import { Breadcrumbs, type Crumb } from "../breadcrumbs"
import { type DocsPage, pageAt } from "../docs-tree"

export const DOCS_ROOT: Crumb = Object.freeze({ href: "/docs", label: "Docs" })

const DocsTreeContext = createContext<readonly DocsPage[] | null>(null)

export type DocsTreeProviderProps = {
  readonly pages: readonly DocsPage[]
  readonly children: ReactNode
}

export function DocsTreeProvider({ pages, children }: DocsTreeProviderProps) {
  return <DocsTreeContext.Provider value={pages}>{children}</DocsTreeContext.Provider>
}

function ancestorsOf(pages: readonly DocsPage[], target: string): readonly DocsPage[] | null {
  for (const page of pages) {
    if (page.href === target) {
      return []
    }
    const below = ancestorsOf(page.children ?? [], target)
    if (below !== null) {
      return [page, ...below]
    }
  }
  return null
}

export function docsTrail(
  pages: readonly DocsPage[],
  pathname: string | null,
): { readonly trail: readonly Crumb[]; readonly current: string } | null {
  const current = pageAt(pages, pathname)
  if (current === null || current.href === DOCS_ROOT.href) {
    return null
  }
  const ancestors = ancestorsOf(pages, current.href) ?? []
  const deep = current.href.split("/").filter((part) => part.length > 0).length > 1
  if (ancestors.length === 0 && !deep) {
    return null
  }
  const parents = ancestors.map((page) => ({ href: page.href, label: page.label }))
  const trail = parents[0]?.href === DOCS_ROOT.href ? parents : [DOCS_ROOT, ...parents]
  return { trail, current: current.label }
}

export type DocsTrailProps = {
  readonly fallback?: ReactNode
}

export function DocsTrail({ fallback = null }: DocsTrailProps) {
  const pages = useContext(DocsTreeContext)
  const pathname = usePathname()
  const found = pages === null ? null : docsTrail(pages, pathname)
  if (found === null) {
    return <>{fallback}</>
  }
  return <Breadcrumbs trail={found.trail} current={found.current} />
}
