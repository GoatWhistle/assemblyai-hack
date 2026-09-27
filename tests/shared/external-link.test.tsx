import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  EXTERNAL_REL,
  ExternalLink,
  isExternalHref,
  NEW_TAB_NOTE,
} from "@/shared/ui/navigation/external-link"
import { ActionLink } from "@/shared/ui/primitives/action-link"

const SOURCE = "https://www.ismp.org/recommendations/confused-drug-names-list"

describe("a link that leaves the site", () => {
  it("opens in a new tab without handing the opener or the referrer over", () => {
    render(<ExternalLink href={SOURCE}>ISMP list</ExternalLink>)
    const link = screen.getByRole("link", { name: `ISMP list ${NEW_TAB_NOTE}` })
    expect(link.getAttribute("href")).toBe(SOURCE)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe(EXTERNAL_REL)
    expect(EXTERNAL_REL.split(" ").sort()).toEqual(["noopener", "noreferrer"])
  })

  it("carries a decorative icon that screen readers skip", () => {
    render(<ExternalLink href={SOURCE}>ISMP list</ExternalLink>)
    const icon = screen.getByRole("link").querySelector("svg")
    expect(icon?.getAttribute("aria-hidden")).toBe("true")
  })

  it("tells an external address from a route on this site", () => {
    expect(isExternalHref(SOURCE)).toBe(true)
    expect(isExternalHref("http://example.org")).toBe(true)
    expect(isExternalHref("/metrics")).toBe(false)
    expect(isExternalHref("#claim")).toBe(false)
  })

  it("makes an action link to another site behave the same way", () => {
    render(<ActionLink href={SOURCE}>Read the list</ActionLink>)
    const link = screen.getByRole("link", { name: `Read the list ${NEW_TAB_NOTE}` })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe(EXTERNAL_REL)
  })

  it("keeps an action link inside the site in the same tab", () => {
    render(
      <ActionLink href="/docs" icon="forward">
        Read the docs
      </ActionLink>,
    )
    const link = screen.getByRole("link", { name: "Read the docs" })
    expect(link.getAttribute("target")).toBe(null)
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })
})
