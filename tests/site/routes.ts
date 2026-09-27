import { readdirSync } from "node:fs"
import { join } from "node:path"

const PAGES_ROOT = "app/(pages)"

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name).split("\\").join("/")
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (entry.name === "page.tsx") {
      out.push(full)
    }
  }
  return out
}

export function routeOf(file: string): string {
  const segments = file
    .slice(PAGES_ROOT.length + 1)
    .split("/")
    .slice(0, -1)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
  return `/${segments.join("/")}`
}

export function pageFiles(): readonly string[] {
  return walk(PAGES_ROOT, []).sort()
}

export function metadataFiles(): readonly string[] {
  return [...pageFiles(), "app/not-found.tsx", "app/layout.tsx"]
}
