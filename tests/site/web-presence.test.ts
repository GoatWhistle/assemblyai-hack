import { readFileSync } from "node:fs"
import manifest from "@app/manifest"
import robots from "@app/robots"
import sitemap from "@app/sitemap"
import { describe, expect, it } from "vitest"
import { INDEXED_ROUTES, UNINDEXED_ROUTES } from "@/site/routes"
import { absoluteUrl } from "@/site/site-url"
import { pageFiles, routeOf } from "./routes"

const INDEXED = new Set(INDEXED_ROUTES.map((route) => route.path))
const UNINDEXED = new Set(Object.keys(UNINDEXED_ROUTES))

describe("sitemap and robots", () => {
  it("places every page route either in the sitemap or on the list kept out of search", () => {
    for (const file of pageFiles()) {
      const route = routeOf(file)
      expect(INDEXED.has(route) || UNINDEXED.has(route), `${route} (${file})`).toBe(true)
      expect(INDEXED.has(route) && UNINDEXED.has(route), route).toBe(false)
    }
  })

  it("lists only routes that exist", () => {
    const existing = new Set(pageFiles().map(routeOf))
    for (const route of INDEXED) {
      expect(existing.has(route), route).toBe(true)
    }
  })

  it("keeps indexable pages indexable and marks the rest noindex, a redirect or a client harness", () => {
    for (const file of pageFiles()) {
      const route = routeOf(file)
      const source = readFileSync(file, "utf8")
      if (INDEXED.has(route)) {
        expect(source, route).not.toContain("index: false")
        expect(source, route).toContain(`path: "${route}"`)
      } else {
        const excluded =
          source.includes("index: false") ||
          source.includes("permanentRedirect(") ||
          source.startsWith('"use client"')
        expect(excluded, route).toBe(true)
      }
    }
  })

  it("publishes exactly the indexed routes as absolute URLs", () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toEqual(INDEXED_ROUTES.map((route) => absoluteUrl(route.path)))
    expect(urls.every((url) => /^https?:\/\//.test(url))).toBe(true)
  })

  it("allows crawling, keeps the API out and points at the sitemap", () => {
    const result = robots()
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/", disallow: ["/api/"] })
    expect(result.sitemap).toBe(absoluteUrl("/sitemap.xml"))
  })
})

describe("web app manifest", () => {
  const result = manifest()

  it("carries the fields an installed app reads", () => {
    expect(result).toMatchObject({
      short_name: "Readback",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "white",
      theme_color: "white",
      lang: "en",
    })
    expect(result.name).toMatch(/^Readback/)
    expect(result.description).toMatch(/not a medical device/)
  })

  it("matches the browser chrome colour the root layout declares", () => {
    expect(readFileSync("app/layout.tsx", "utf8")).toContain(
      `BROWSER_CHROME_COLOR = "${result.theme_color}"`,
    )
  })

  it("offers any and maskable icons at 192 and 512", () => {
    const icons = result.icons ?? []
    for (const purpose of ["any", "maskable"]) {
      for (const size of ["192x192", "512x512"]) {
        expect(
          icons.some((icon) => icon.purpose === purpose && icon.sizes === size),
          `${purpose} ${size}`,
        ).toBe(true)
      }
    }
  })
})
