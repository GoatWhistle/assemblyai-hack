import { expect, test } from "@playwright/test"

test.describe("the evidence surfaces a judge is sent to", () => {
  test("every benchmark figure carries its command, and absence is a dash", async ({
    page,
  }) => {
    await page.goto("/metrics")
    await expect(
      page.getByText(/asks about every correct drug name: (\d+|—) of (\d+|—)/i).first(),
    ).toBeVisible()
    await expect(page.getByRole("region", { name: /Shipped policy figures/ })).toBeVisible()
    await expect(page.getByText("npx tsx scripts/measure/ab-gate.ts").first()).toBeVisible()
    await expect(page.getByText("make eval-control").first()).toBeVisible()
    await expect(page.getByLabel("not measured").first()).toBeVisible()
  })

  test("the comparison shows six moments with the verdict beside the certainty", async ({
    page,
  }) => {
    await page.goto("/compare")
    await expect(page.getByRole("row")).toHaveCount(7)
    await expect(page.getByText("E_LASA_HIT").first()).toBeVisible()
  })

  test("a receipt for an unknown session is refused, not shown empty", async ({ page }) => {
    await page.goto("/order/no-such-session")
    await expect(
      page.getByText(/no receipt for this session|could not be loaded/i).first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByLabel(/check a receipt file/i)).toBeVisible()
  })

  test("the cover is exactly 1920 by 1080", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto("/cover")
    const size = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))
    expect(size).toEqual({ width: 1920, height: 1080 })
  })
})

test.describe("phone width", () => {
  for (const path of ["/", "/?judge=1", "/live", "/compare", "/metrics"]) {
    test(`${path} does not scroll horizontally`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }
})
