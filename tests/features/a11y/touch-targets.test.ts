import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SITE_HEADER = "src/shared/ui/primitives/site-header/styles.module.css"

describe("the brand link in the site header clears the touch floor", () => {
  it("declares a min-height on .brand, not only on the nav links beside it", () => {
    const source = readFileSync(SITE_HEADER, "utf8")
    const brandBlock = source.slice(source.indexOf(".brand {"), source.indexOf(".brand svg"))
    expect(
      brandBlock,
      "measured in a browser at 1440x900 the brand link that wraps the wordmark and reads 'Readback' was 117.9x28.6px, well under the 44px floor, while the nav links beside it correctly carried the token; the file-level ratchet passed because it only checks whether some declaration in the file reaches the floor, not whether every interactive selector does",
    ).toContain("min-height: var(--target-touch)")
  })

  it("names the token rather than a raw 44, matching how the nav links already do it", () => {
    const source = readFileSync(SITE_HEADER, "utf8")
    const brandBlock = source.slice(source.indexOf(".brand {"), source.indexOf(".brand svg"))
    expect(/min-height:\s*44px/.test(brandBlock)).toBe(false)
  })
})
