import { expect, type Page, test } from "@playwright/test"

const DOCS_PATHS = [
  "/docs",
  "/how-it-works",
  "/compare",
  "/metrics",
  "/metrics/benchmark",
  "/metrics/operations",
  "/docs/limitations",
  "/docs/threat-model",
  "/docs/glossary",
]

async function logoX(page: Page, path: string): Promise<number> {
  await page.goto(path)
  const box = await page.getByRole("banner").getByRole("link").first().boundingBox()
  return box?.x ?? -1
}

test.describe("r2: the docs chrome", () => {
  test("A1r2-02: the docs header sits where every other page puts it", async ({ page }) => {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const home = await logoX(page, "/")
      const docs = await logoX(page, "/docs")
      expect(Math.abs(home - docs), `logo at ${width}px`).toBeLessThanOrEqual(2)
    }
  })

  test("A2 N2: the pager moves focus to the new page's heading, inside the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/docs")
    const next = page.getByRole("link", { name: /^Next page: / })
    await next.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/how-it-works$/)
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeFocused()
    await expect(heading).toBeInViewport()
  })

  test("A2 N7: pager and contents toggle names keep their words apart", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/how-it-works")
    await expect(page.getByRole("link", { name: "Previous page: Overview" })).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Next page: Compare" })).toHaveCount(1)
    const toggle = page.getByRole("navigation", { name: "Documentation" }).getByRole("button")
    await expect(toggle).toHaveAccessibleName(/^Docs: How it works/)
  })

  test("A2 N3: the drawer chevron points down when closed and up when open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/metrics")
    const toggle = page.getByRole("navigation", { name: "Documentation" }).getByRole("button")
    const chevron = toggle.locator("svg")
    const turn = () => chevron.evaluate((node) => getComputedStyle(node).transform)
    expect(await turn()).toBe("none")
    await toggle.click()
    await expect.poll(turn).not.toBe("none")
  })

  for (const path of DOCS_PATHS) {
    test(`A2 N4: ${path} reflows at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }

  test("A2 N4: compare reason codes stay inside their frame at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto("/compare")
    const clipped = await page.evaluate(
      () =>
        [...document.querySelectorAll("main code")].filter((code) => {
          const frame = code.closest("[class*='frame'], figure")
          if (frame === null) {
            return false
          }
          return code.getBoundingClientRect().right > frame.getBoundingClientRect().right + 1
        }).length,
    )
    expect(clipped).toBe(0)
  })

  test("A1r2-01: an unknown address answers 404 with one primary way forward", async ({
    page,
  }) => {
    const response = await page.goto("/no-such-page")
    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const main = page.getByRole("main")
    await expect(main.getByRole("link", { name: /Watch the .*replay/ })).toBeVisible()
    await expect(main.getByRole("link", { name: "Start a call" })).toHaveAttribute("href", "/")
    await expect(main.getByRole("link", { name: "Read the docs" })).toBeVisible()
  })

  test("r2-A5 N3: the close-code table counts the rate-limiter closes", async ({ page }) => {
    await page.goto("/metrics/operations")
    const table = page.getByRole("region", { name: "Socket close codes" })
    await expect(table.getByRole("row", { name: /^1008/ })).toBeVisible()
    await expect(table.getByRole("row", { name: /^1006/ })).toBeVisible()
    await expect(
      page.locator("section#close-codes").getByText("npx tsx scripts/report/live-run-count.ts"),
    ).toBeVisible()
  })

  test("owner r3: the docs sidebar lists the docs and nothing else", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/docs")
    const hrefs = await page
      .getByRole("navigation", { name: "Documentation" })
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
    const foreign = hrefs.filter((href) => !href.startsWith("#") && !DOCS_PATHS.includes(href))
    expect(foreign).toEqual([])
  })

  test("owner r3: a contents jump glides to the section and marks where it landed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/how-it-works")
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      "at rest the page scrolls instantly, so focus moves and page changes never glide",
    ).toBe("auto")
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "Attack console" })
      .click()
    await expect(page).toHaveURL(/#attack$/)
    const heading = page.locator("#attack-title")
    await expect(heading).toHaveAttribute("data-arrival", "")
    await expect(heading).toBeFocused()
    const top = await heading.evaluate((node) => node.getBoundingClientRect().top)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThan(120)
    await expect(heading).not.toHaveAttribute("data-arrival", "", { timeout: 4000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/how-it-works$/)
  })

  test("owner r3: the phone contents drawer animates open and closed", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/how-it-works")
    const nav = page.getByRole("navigation", { name: "Documentation" })
    const toggle = nav.getByRole("button")
    const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`)
    const style = () =>
      panel.evaluate((node) => {
        const computed = getComputedStyle(node)
        return { visibility: computed.visibility, duration: computed.transitionDuration }
      })
    expect((await style()).visibility).toBe("hidden")
    expect((await style()).duration).not.toMatch(/^0s(, 0s)*$/)
    await toggle.click()
    await expect.poll(async () => (await style()).visibility).toBe("visible")
    await nav.getByRole("link", { name: "Attack console" }).click()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect.poll(async () => (await style()).visibility).toBe("hidden")
    await expect(page).toHaveURL(/#attack$/)
  })

  test("owner r3: with reduced motion the jump is instant", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    await page.goto("/how-it-works")
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "Attack console" })
      .click()
    const landed = await page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() =>
            resolve(document.getElementById("attack-title")?.getBoundingClientRect().top ?? -1),
          ),
        ),
    )
    expect(landed).toBeGreaterThanOrEqual(0)
    expect(landed).toBeLessThan(120)
    await context.close()
  })

  test("A2 N2r: every page change lands at the top, even mid-way down a long page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/how-it-works")
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page
      .getByRole("navigation", { name: "Documentation" })
      .getByRole("link", { name: "Glossary" })
      .click()
    await expect(page).toHaveURL(/\/docs\/glossary$/)
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  })
})
