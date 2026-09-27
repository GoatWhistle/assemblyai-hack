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
    await expect(table.getByText("npx tsx scripts/report/live-run-count.ts")).toBeVisible()
  })
})
