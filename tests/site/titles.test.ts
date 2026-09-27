import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  FORBIDDEN_TITLE_SEPARATOR,
  fullTitle,
  OG_IMAGE,
  pageMetadata,
  TITLE_TEMPLATE,
} from "@/site/page-metadata"
import { resolveSiteUrl } from "@/site/site-url"
import { metadataFiles } from "./routes"

const TITLE_LITERAL = /\btitle:\s*(?:\{\s*absolute:\s*)?"([^"]*)"/g

function titlesIn(file: string): readonly string[] {
  return [...readFileSync(file, "utf8").matchAll(TITLE_LITERAL)].map((match) => match[1] ?? "")
}

describe("tab titles read 'Page | Readback'", () => {
  it("builds every title from one template with a vertical bar", () => {
    expect(TITLE_TEMPLATE).toBe("%s | Readback")
    expect(fullTitle("Glossary")).toBe("Glossary | Readback")
    expect(readFileSync("app/layout.tsx", "utf8")).toContain("template: TITLE_TEMPLATE")
  })

  it("finds a title in every page that declares metadata", () => {
    const found = metadataFiles().flatMap((file) => titlesIn(file))
    expect(found.length).toBeGreaterThanOrEqual(15)
  })

  it("puts no dash, middle dot or bullet in any title", () => {
    for (const file of metadataFiles()) {
      for (const title of titlesIn(file)) {
        expect(FORBIDDEN_TITLE_SEPARATOR.test(title), `${file}: ${title}`).toBe(false)
        expect(FORBIDDEN_TITLE_SEPARATOR.test(fullTitle(title)), `${file}: ${title}`).toBe(
          false,
        )
      }
    }
  })

  it("keeps the bar for the template alone, apart from the home page's own brand-first title", () => {
    for (const file of metadataFiles()) {
      for (const title of titlesIn(file)) {
        if (title.includes("|")) {
          expect(title, file).toMatch(/^Readback \| [^|]+$/)
        }
      }
    }
  })

  it("rejects the separators the owner banned", () => {
    for (const bad of [
      "Docs \u2014 Readback",
      "Docs \u2013 Readback",
      "Docs \u00b7 Readback",
      "Docs - Readback",
      "Docs \u2022 Readback",
    ]) {
      expect(FORBIDDEN_TITLE_SEPARATOR.test(bad), bad).toBe(true)
    }
    expect(FORBIDDEN_TITLE_SEPARATOR.test("Look-alike pairs | Readback")).toBe(false)
  })
})

describe("page metadata", () => {
  it("carries a canonical path and the same full title to Open Graph and the Twitter card", () => {
    const metadata = pageMetadata({ title: "Compare", description: "d", path: "/compare" })
    expect(metadata.title).toBe("Compare")
    expect(metadata.alternates?.canonical).toBe("/compare")
    expect(metadata.openGraph).toMatchObject({
      title: "Compare | Readback",
      siteName: "Readback",
      locale: "en_US",
      images: [OG_IMAGE],
    })
    expect(String((metadata.openGraph as { url?: unknown }).url)).toMatch(/\/compare$/)
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Compare | Readback",
    })
  })

  it("passes robots through and leaves the canonical out when there is no single path", () => {
    const metadata = pageMetadata({
      title: "Order receipt",
      description: "d",
      robots: { index: false },
    })
    expect(metadata.robots).toEqual({ index: false })
    expect(metadata.alternates).toBeUndefined()
  })

  it("resolves the site address from the configured URL, then the Vercel production host", () => {
    expect(resolveSiteUrl({ appUrl: "https://example.test/" })).toBe("https://example.test")
    expect(resolveSiteUrl({ appUrl: "  ", productionHost: "readback-rx.vercel.app" })).toBe(
      "https://readback-rx.vercel.app",
    )
    expect(resolveSiteUrl({})).toBe("http://localhost:3000")
  })
})
