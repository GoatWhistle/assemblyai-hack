export type DocsSection = {
  readonly id: string
  readonly label: string
}

export type DocsPage = {
  readonly href: string
  readonly label: string
  readonly title: string
  readonly summary: string
  readonly sections: readonly DocsSection[]
  readonly children?: readonly DocsPage[]
}

export function flattenPages(pages: readonly DocsPage[]): readonly DocsPage[] {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])])
}

export function pageAt(pages: readonly DocsPage[], pathname: string | null): DocsPage | null {
  if (pathname === null) {
    return null
  }
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return flattenPages(pages).find((page) => page.href === path) ?? null
}

export function containsPage(page: DocsPage, target: DocsPage | null): boolean {
  if (target === null) {
    return false
  }
  return flattenPages([page]).some((entry) => entry.href === target.href)
}

export function sectionHref(section: DocsSection): string {
  return `#${section.id}`
}
