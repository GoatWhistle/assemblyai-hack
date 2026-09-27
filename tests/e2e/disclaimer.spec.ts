import { expect, type Page, test } from "@playwright/test"

const MARK = /^Medical disclaimer: a technology demonstration, not a medical device$/

const TITLE = "This is a technology demonstration, not a medical device"

const LAST_LINE = "Do not enter real patient data into this application."

const TEXTS = [
  TITLE,
  "Synthetic data only.",
  "It is not affiliated with, endorsed by, or reviewed by any of them.",
  LAST_LINE,
]

const ROUTES = ["/", "/demo", "/docs", "/how-it-works", "/metrics", "/order", "/no-such-page"]

function markOf(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: MARK })
}

async function sheetOf(page: Page) {
  const id = await markOf(page).getAttribute("aria-controls")
  return page.locator(`[id="${id}"]`)
}

test.describe("the medical disclaimer lives behind the header mark on every page", () => {
  for (const route of ROUTES) {
    test(`${route} carries the full text once and no block below the content`, async ({
      page,
    }) => {
      await page.goto(route)
      await expect(markOf(page)).toBeVisible()
      const sheet = await sheetOf(page)
      for (const text of TEXTS) {
        await expect(sheet).toContainText(text)
        await expect(page.getByText(text, { exact: false })).toHaveCount(1)
      }
      await expect(page.locator("main").first()).not.toContainText(TITLE)
      await expect(page.getByText("Read the full notice")).toHaveCount(0)
    })
  }

  test("hover opens it after a short delay and leaving closes it after the grace", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/docs")
    const mark = markOf(page)
    const sheet = await sheetOf(page)
    await expect(sheet).toBeHidden()
    await mark.hover()
    await expect(mark).toHaveAttribute("aria-expanded", "true")
    await expect(sheet.getByRole("heading", { name: TITLE })).toBeVisible()
    await sheet.hover()
    await page.waitForTimeout(400)
    await expect(mark).toHaveAttribute("aria-expanded", "true")
    await page.mouse.move(1400, 880)
    await expect(mark).toHaveAttribute("aria-expanded", "false")
    await expect(sheet).toBeHidden()
  })

  test("keyboard focus opens it and Escape closes it", async ({ page }) => {
    await page.goto("/demo")
    await markOf(page).focus()
    await expect(markOf(page)).toHaveAttribute("aria-expanded", "true")
    await expect((await sheetOf(page)).getByText(LAST_LINE)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(markOf(page)).toHaveAttribute("aria-expanded", "false")
    await expect(markOf(page)).toBeFocused()
  })

  test("click toggles it and a press outside closes it", async ({ page }) => {
    await page.goto("/docs")
    await markOf(page).click()
    await expect(markOf(page)).toHaveAttribute("aria-expanded", "true")
    await page.mouse.move(1200, 600)
    await page.waitForTimeout(400)
    await expect(
      markOf(page),
      "a clicked sheet stays open without the pointer",
    ).toHaveAttribute("aria-expanded", "true")
    await page.mouse.click(1200, 600)
    await expect(markOf(page)).toHaveAttribute("aria-expanded", "false")
  })

  for (const width of [360, 390, 1440, 2560]) {
    test(`the sheet stays inside the viewport at ${width}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        hasTouch: width < 500,
      })
      const page = await context.newPage()
      await page.goto("/")
      const mark = markOf(page)
      const box = await mark.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(width < 641 ? 28 : 44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      const reach = await mark.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        const y = rect.top + rect.height / 2
        let hits = 0
        for (let x = Math.floor(rect.left) - 12; x < rect.right + 12; x += 1) {
          if (node.contains(document.elementFromPoint(x + 0.5, y))) {
            hits += 1
          }
        }
        return hits
      })
      expect(
        reach,
        "the hit area is 44px wide even where the drawn box is narrower",
      ).toBeGreaterThanOrEqual(44)
      if (width < 500) {
        await mark.tap()
      } else {
        await mark.click()
      }
      const sheet = await sheetOf(page)
      await expect(sheet).toBeVisible()
      await page.waitForTimeout(300)
      const placed = await sheet.boundingBox()
      expect(placed?.x ?? -1).toBeGreaterThanOrEqual(0)
      expect((placed?.x ?? 0) + (placed?.width ?? 0)).toBeLessThanOrEqual(width)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
      await context.close()
    })
  }
})
