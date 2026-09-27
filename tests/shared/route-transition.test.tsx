import { readFileSync } from "node:fs"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigation = vi.hoisted(() => ({ pathname: "/docs", push: vi.fn() }))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}))

const {
  ROUTE_ENTER_ATTRIBUTE,
  ROUTE_ENTER_CLEAR_MS,
  RouteTransition,
  ROUTE_RENDER_WAIT_MS,
  transitionTarget,
} = await import("@/shared/ui/motion/route-transition")

type Callback = () => Promise<void>

let callbacks: Callback[] = []

let skipped = 0

function anchor(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
  const link = document.createElement("a")
  link.setAttribute("href", href)
  for (const [name, value] of Object.entries(attributes)) {
    link.setAttribute(name, value)
  }
  link.textContent = href
  document.body.append(link)
  return link
}

function click(link: HTMLAnchorElement, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init })
  link.dispatchEvent(event)
  return event
}

beforeEach(() => {
  callbacks = []
  skipped = 0
  navigation.pathname = "/docs"
  navigation.push.mockReset()
  window.history.replaceState(null, "", "/docs")
  Object.assign(document, {
    startViewTransition: (callback: Callback) => {
      callbacks.push(callback)
      return {
        finished: Promise.resolve(),
        skipTransition: () => {
          skipped += 1
        },
      }
    },
  })
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition")
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ""
  document.documentElement.removeAttribute("data-route-enter")
})

describe("the route transition never hijacks an in-page jump", () => {
  it("leaves a skip link to the browser, so focus can move into the main region", () => {
    render(<RouteTransition />)
    const event = click(anchor("#main"))
    expect(
      event.defaultPrevented,
      "intercepting #main replaced native fragment navigation with router.push, so the skip link moved nothing for every keyboard user with motion allowed (r1-A2 F1)",
    ).toBe(false)
    expect(callbacks).toHaveLength(0)
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it("leaves a same-page link with a query or a hash to the page itself", () => {
    expect(transitionTarget(anchor("/docs#toc"), window.location)).toBeNull()
    expect(transitionTarget(anchor("/docs?tab=2"), window.location)).toBeNull()
  })

  it("ignores modified clicks, new tabs, downloads and explicitly opted-out links", () => {
    render(<RouteTransition />)
    expect(click(anchor("/metrics"), { metaKey: true }).defaultPrevented).toBe(false)
    expect(click(anchor("/metrics", { target: "_blank" })).defaultPrevented).toBe(false)
    expect(click(anchor("/metrics", { download: "" })).defaultPrevented).toBe(false)
    expect(click(anchor("/metrics", { "data-no-transition": "" })).defaultPrevented).toBe(false)
    expect(callbacks).toHaveLength(0)
  })

  it("stands aside when another handler already took the click", () => {
    window.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
    render(<RouteTransition />)
    click(anchor("/metrics"))
    expect(callbacks).toHaveLength(0)
  })
})

describe("a real route change waits for the new page before the new snapshot", () => {
  it("pushes inside the transition and resolves only once the pathname changes", async () => {
    const view = render(<RouteTransition />)
    const event = click(anchor("/metrics"))
    expect(event.defaultPrevented).toBe(true)
    expect(callbacks).toHaveLength(1)
    let settled = false
    const done = callbacks[0]?.().then(() => {
      settled = true
    })
    expect(navigation.push).toHaveBeenCalledWith("/metrics")
    await Promise.resolve()
    expect(
      settled,
      "resolving before the new route rendered captured the old page as the new snapshot, a double exposure of the page over itself (r1-A4 A4-05)",
    ).toBe(false)
    navigation.pathname = "/metrics"
    view.rerender(<RouteTransition />)
    await act(async () => {
      await done
    })
    expect(settled).toBe(true)
  })

  it("gives up waiting after a bounded delay rather than freezing the page", async () => {
    vi.useFakeTimers()
    render(<RouteTransition />)
    click(anchor("/compare"))
    let settled = false
    void callbacks[0]?.().then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(ROUTE_RENDER_WAIT_MS - 1)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(true)
  })

  it("does nothing at all for a viewer who asked for reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    render(<RouteTransition />)
    expect(click(anchor("/metrics")).defaultPrevented).toBe(false)
    expect(callbacks).toHaveLength(0)
  })
})

describe("a page change animates even where the view transition cannot", () => {
  it("skips a transition whose page came too late, rather than fading the old page into itself", async () => {
    vi.useFakeTimers()
    render(<RouteTransition />)
    click(anchor("/compare"))
    void callbacks[0]?.()
    await vi.advanceTimersByTimeAsync(ROUTE_RENDER_WAIT_MS)
    expect(skipped).toBe(1)
  })

  it("lets the late page enter on its own once it arrives", async () => {
    vi.useFakeTimers()
    const view = render(<RouteTransition />)
    click(anchor("/compare"))
    void callbacks[0]?.()
    await vi.advanceTimersByTimeAsync(ROUTE_RENDER_WAIT_MS)
    navigation.pathname = "/compare"
    view.rerender(<RouteTransition />)
    expect(document.documentElement.hasAttribute(ROUTE_ENTER_ATTRIBUTE)).toBe(true)
    await vi.advanceTimersByTimeAsync(ROUTE_ENTER_CLEAR_MS)
    expect(document.documentElement.hasAttribute(ROUTE_ENTER_ATTRIBUTE)).toBe(false)
  })

  it("animates the new main column in a browser without view transitions", () => {
    Reflect.deleteProperty(document, "startViewTransition")
    const view = render(<RouteTransition />)
    navigation.pathname = "/metrics"
    view.rerender(<RouteTransition />)
    expect(document.documentElement.hasAttribute(ROUTE_ENTER_ATTRIBUTE)).toBe(true)
  })

  it("does not animate the page change for a viewer who asked for reduced motion", () => {
    Reflect.deleteProperty(document, "startViewTransition")
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    const view = render(<RouteTransition />)
    navigation.pathname = "/metrics"
    view.rerender(<RouteTransition />)
    expect(document.documentElement.hasAttribute(ROUTE_ENTER_ATTRIBUTE)).toBe(false)
  })

  it("keeps the header and the docs sidebar still and the table of contents in place", () => {
    const sheet = readFileSync("src/styles/tokens/route-motion.css", "utf8")
    expect(sheet).toMatch(/::view-transition-group\(docs-toc\)/)
    expect(sheet).toMatch(/html\[data-route-enter\] main \{\s*animation:/)
    const shell = readFileSync("src/shared/ui/navigation/docs-shell/styles.module.css", "utf8")
    expect(shell).toContain("view-transition-name: docs-toc")
    expect(shell).toContain("view-transition-name: docs-nav")
  })
})
