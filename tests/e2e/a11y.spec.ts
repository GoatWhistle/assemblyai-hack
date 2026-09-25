import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const ROUTES = [
  "/",
  "/?judge=1",
  "/live",
  "/demo",
  "/compare",
  "/order/no-such-session",
  "/metrics",
  "/how-it-works",
  "/cover",
  "/deck",
] as const

const BLOCKING = new Set(["serious", "critical"])

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function blockingViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude("nextjs-portal")
    .analyze()
  return results.violations
    .filter((violation) => BLOCKING.has(violation.impact ?? ""))
    .map(
      (violation) =>
        `${violation.impact} ${violation.id}: ${violation.help} at ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    )
}

test.describe("AU5: no serious or critical axe violation on any route a judge can reach", () => {
  for (const path of ROUTES) {
    test(`${path} at desktop width`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState("load")
      await page.waitForTimeout(1500)
      expect(await blockingViolations(page)).toEqual([])
    })
  }

  for (const path of ["/", "/?judge=1", "/live", "/compare", "/metrics"] as const) {
    test(`${path} at phone width`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(path)
      await page.waitForLoadState("load")
      await page.waitForTimeout(1500)
      expect(await blockingViolations(page)).toEqual([])
    })
  }

  test("the judge replay stays clean after the verdict has landed", async ({ page }) => {
    await page.goto("/?judge=1")
    await expect(page.getByText(/Pair rule on: asks which of the two/).first()).toBeVisible({
      timeout: 20000,
    })
    expect(await blockingViolations(page)).toEqual([])
  })
})

async function focusedOutline(page: Page): Promise<{ tag: string; outline: string }> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    const style = active === null ? null : getComputedStyle(active)
    return {
      tag: active?.tagName ?? "",
      outline:
        style === null
          ? "none"
          : `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`,
    }
  })
}

async function tabUntil(page: Page, name: RegExp, limit = 40): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press("Tab")
    const label = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      if (active === null || active === document.body) {
        return ""
      }
      return active.innerText || (active.getAttribute("aria-label") ?? "")
    })
    if (name.test(label)) {
      return
    }
  }
  throw new Error(`no focusable control matching ${name} within ${limit} tabs`)
}

test.describe("AU5: the judge path works from the keyboard alone, with focus always visible", () => {
  test("skip link, replay entry and replay controls are reached and operated by keyboard", async ({
    page,
  }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /skip to the content/i })).toBeFocused()
    expect((await focusedOutline(page)).outline).not.toMatch(/^none/)

    await tabUntil(page, /watch the 40-second case/i)
    expect((await focusedOutline(page)).outline).not.toMatch(/^none/)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/judge=1/)
    await expect(page.getByText(/Pair rule on: asks which of the two/).first()).toBeVisible({
      timeout: 20000,
    })

    await expect(page.getByRole("button", { name: /play again/i })).toBeEnabled({
      timeout: 20000,
    })
    await tabUntil(page, /play again/i)
    const play = await focusedOutline(page)
    expect(play.tag).toBe("BUTTON")
    expect(play.outline).not.toMatch(/^none/)
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: /^stop$/i })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: /play (again|the replay)/i })).toBeFocused()
  })

  test("every nav link shows a focus ring that is not hidden under anything", async ({
    page,
  }) => {
    await page.goto("/live")
    for (const name of ["Live call", "How it works", "Compare", "Replay", "Measurements"]) {
      const link = page.getByRole("navigation").first().getByRole("link", { name })
      await link.focus()
      const visible = await link.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        const top = document.elementFromPoint(x, y)
        const style = getComputedStyle(element)
        return {
          covered: top !== null && !element.contains(top) && top !== element,
          outline: style.outlineStyle,
        }
      })
      expect(visible.outline, `${name} has no focus outline`).not.toBe("none")
      expect(visible.covered, `${name} is covered while focused`).toBe(false)
    }
  })
})

test.describe("AU5: prefers-reduced-motion stills every animation a judge would see", () => {
  for (const path of ["/", "/?judge=1", "/live", "/how-it-works"] as const) {
    test(`${path} runs no animation longer than a frame`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto(path)
      await page.waitForLoadState("load")
      await page.waitForTimeout(500)
      const moving = await page.evaluate(() =>
        document
          .getAnimations()
          .map((animation) => {
            const timing = animation.effect?.getComputedTiming()
            const duration = typeof timing?.duration === "number" ? timing.duration : 0
            return { name: (animation as CSSAnimation).animationName ?? "transition", duration }
          })
          .filter((entry) => entry.duration > 16),
      )
      expect(moving).toEqual([])
    })
  }

  test("the judge replay lands on its verdict at once instead of playing out", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/?judge=1")
    await expect(page.getByText(/18\.6s \/ 18\.6s/).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("E_LASA_HIT").first()).toBeVisible()
  })
})
