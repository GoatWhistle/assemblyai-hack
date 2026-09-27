import { expect, test } from "@playwright/test"

test.describe("the evidence surfaces a judge is sent to", () => {
  test("the measurements page leads with the headline and the shipped policy, each with its command", async ({
    page,
  }) => {
    await page.goto("/metrics")
    await expect(
      page.getByText(/asks about every correct drug name: (\d+|—) of (\d+|—)/i).first(),
    ).toBeVisible()
    await expect(page.getByRole("region", { name: /Shipped policy figures/ })).toBeVisible()
    await expect(page.getByText("npx tsx scripts/measure/ab-gate.ts").first()).toBeVisible()
    await expect(page.locator("[data-headline='catch']")).toBeVisible()
    await expect(page.locator("[data-headline='cost']")).toBeVisible()
    await expect(page.getByRole("link", { name: /Benchmark/ }).first()).toBeVisible()
  })

  test("every benchmark figure carries its command, and absence is a dash", async ({
    page,
  }) => {
    await page.goto("/metrics/benchmark")
    await expect(page.getByRole("region", { name: /Measured benchmark figures/ })).toBeVisible()
    await expect(page.getByText("make eval-control").first()).toBeVisible()
    await expect(page.getByLabel("not measured").first()).toBeVisible()
    await expect(page.getByRole("region", { name: /Further report figures/ })).toBeVisible()
  })

  test("the operations page counts close codes rather than asserting them", async ({
    page,
  }) => {
    await page.goto("/metrics/operations")
    await expect(page.getByRole("region", { name: "Socket close codes" })).toBeVisible()
    await expect(
      page.getByText(/documents no WebSocket close codes at all/).first(),
    ).toBeVisible()
    await expect(page.getByText(/no cost of a dispensing error is shown/i)).toBeVisible()
  })

  test("the docs overview states the hard claim and maps every docs page", async ({ page }) => {
    await page.goto("/docs")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(/even at certainty 1\.00/).first()).toBeVisible()
    const main = page.getByRole("main")
    for (const href of [
      "/how-it-works",
      "/compare",
      "/metrics",
      "/metrics/benchmark",
      "/metrics/operations",
      "/docs/limitations",
      "/docs/threat-model",
      "/docs/glossary",
      "/demo",
    ]) {
      await expect(main.locator(`a[href="${href}"]`).first()).toBeVisible()
    }
  })

  test("the docs sidebar marks the current page and the contents link to real sections", async ({
    page,
  }) => {
    await page.goto("/how-it-works")
    const nav = page.getByRole("navigation", { name: "Documentation" })
    await expect(nav.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    const toc = page.getByRole("navigation", { name: "On this page" })
    const targets = await toc
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
    expect(targets.length).toBeGreaterThan(1)
    for (const target of targets) {
      await expect(page.locator(target)).toHaveCount(1)
    }
  })

  test("the comparison shows six moments with the verdict beside the certainty", async ({
    page,
  }) => {
    await page.goto("/compare")
    await expect(page.locator("tbody tr[data-row]")).toHaveCount(6)
    await expect(page.locator('tbody th[scope="row"]')).toHaveCount(6)
    await expect(page.getByText("E_LASA_HIT").first()).toBeVisible()
  })

  test("limitations are two clicks from the header and read as text", async ({ page }) => {
    await page.goto("/")
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "Docs", exact: true })
      .click()
    await page
      .getByRole("navigation", { name: "Documentation" })
      .getByRole("link", { name: "Limitations" })
      .click()
    await expect(page).toHaveURL(/\/docs\/limitations$/)
    await expect(page.getByText(/call 911, or 988/)).toBeVisible()
    await expect(page.locator("main details")).toHaveCount(1)
    await expect(page.locator("main details").getByText(/call 911, or 988/)).toHaveCount(0)
    await expect(page.locator("main details summary")).toHaveText("The ten open weaknesses")
  })

  test("the threat model quotes the witness boundary and links the receipt checker", async ({
    page,
  }) => {
    await page.goto("/docs/threat-model")
    await expect(page.getByText(/does not prove the audio came from a human/)).toBeVisible()
    await page.getByRole("link", { name: "Check a downloaded receipt file" }).click()
    await expect(page.getByLabel(/check a receipt file/i)).toBeVisible({ timeout: 15000 })
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
  for (const path of [
    "/",
    "/demo",
    "/docs",
    "/how-it-works",
    "/compare",
    "/metrics",
    "/metrics/benchmark",
    "/metrics/operations",
    "/docs/limitations",
    "/docs/threat-model",
    "/docs/glossary",
  ]) {
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

test.describe("r1-A2-F8: the docs navigation stays reachable on a long page at phone width", () => {
  test("the contents toggle stays on screen after scrolling, and a section link closes it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/metrics/benchmark")
    const nav = page.getByRole("navigation", { name: "Documentation" })
    const toggle = nav.getByRole("button")
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await expect(toggle).toBeInViewport()
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await nav.getByRole("link", { name: "Not measured yet" }).click()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(page).toHaveURL(/#unmeasured$/)
  })

  test("r1-A2-F12: the breadcrumb back to Measurements is a full touch target", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    const page = await context.newPage()
    await page.goto("/metrics/benchmark")
    const crumb = page
      .getByRole("main")
      .getByRole("link", { name: "Measurements", exact: true })
    const box = await crumb.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await context.close()
  })
})
