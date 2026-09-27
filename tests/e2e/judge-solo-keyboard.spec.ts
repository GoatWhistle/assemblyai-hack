import { expect, type Page, test } from "@playwright/test"

async function holdTokens(page: Page): Promise<void> {
  await page.route("**/api/tokens/**", () => new Promise<void>(() => undefined))
  await page.route("**/api/budget", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budget: { remainingSeconds: 7200, exhausted: false } }),
    }),
  )
}

test.describe("the microphone keeps the keyboard's place", () => {
  test("Space starts, Escape cancels, and focus stays on the microphone throughout", async ({
    page,
  }) => {
    await holdTokens(page)
    await page.goto("/")
    const mic = page.getByRole("button", { name: "Start listening" })
    await mic.focus()
    await page.keyboard.press("Space")
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("button", { name: "Start listening" }),
      "a disabled button while closing drops focus to the body (r2-A2 N1)",
    ).toBeFocused()
  })

  test("a touch screen shows how to cancel while connecting", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
      permissions: ["microphone"],
    })
    const page = await context.newPage()
    await holdTokens(page)
    await page.goto("/")
    await page.getByRole("button", { name: "Start listening" }).tap()
    await expect(page.getByText("Tap the button again to cancel")).toBeVisible()
    await context.close()
  })

  test("a spent budget is said before the microphone is pressed", async ({ page }) => {
    await page.route("**/api/budget", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          budget: { remainingSeconds: 0, exhausted: true },
          explanation: "the daily cap is reached",
        }),
      }),
    )
    await page.goto("/")
    await expect(
      page.getByRole("region", { name: "Live calls are paused for today" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Watch the replay" })).toBeInViewport()
    await expect(page.getByRole("button", { name: "Start listening" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })
})

test.describe("the replay controls keep focus on the control that was pressed", () => {
  test("Play keeps focus as Pause, and Stop hands focus back to Play", async ({ page }) => {
    await page.goto("/demo")
    const play = page.getByRole("button", { name: /play the replay/i })
    await play.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: "Restart the replay" })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: /^stop$/i })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: /play (again|the replay)/i })).toBeFocused()
  })
})

test.describe("reflow at 320 CSS pixels", () => {
  for (const path of ["/demo", "/order/no-such-session", "/order"]) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto(path)
      await page.waitForLoadState("load")
      const width = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(width).toBeLessThanOrEqual(320)
    })
  }
})
