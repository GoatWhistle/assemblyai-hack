export type Box = {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

export type NoticeInput = {
  readonly anchor: Box
  readonly bounds: Box
  readonly sheetWidth: number
  readonly viewportHeight: number
  readonly compact: boolean
}

export type NoticePlacement = {
  readonly top: number
  readonly left: number
  readonly width: number | null
  readonly maxHeight: number
  readonly originX: number
}

export const NOTICE_GAP_PX = 6

export const NOTICE_GLYPH_INSET_PX = 31

export const NOTICE_EDGE_PX = 16

const COMPACT_QUERY = "(max-width: 40rem)"

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high))
}

export function placeNotice({
  anchor,
  bounds,
  sheetWidth,
  viewportHeight,
  compact,
}: NoticeInput): NoticePlacement {
  const centre = (anchor.left + anchor.right) / 2
  const top = anchor.bottom + NOTICE_GAP_PX
  const maxHeight = Math.max(viewportHeight - top - NOTICE_EDGE_PX, 0)
  if (compact) {
    const width = Math.max(bounds.right - bounds.left, 0)
    return { top, left: bounds.left, width, maxHeight, originX: centre - bounds.left }
  }
  const width = Math.min(sheetWidth, bounds.right - bounds.left)
  const left = clamp(centre - NOTICE_GLYPH_INSET_PX, bounds.left, bounds.right - width)
  return { top, left, width: null, maxHeight, originX: centre - left }
}

export function placeSheet(trigger: HTMLElement, sheet: HTMLElement): void {
  const bounds =
    trigger.closest("header")?.getBoundingClientRect() ??
    new DOMRect(0, 0, globalThis.innerWidth, 0)
  const compact = globalThis.matchMedia?.(COMPACT_QUERY)?.matches === true
  const box = trigger.getBoundingClientRect()
  const mark = trigger.firstElementChild?.getBoundingClientRect() ?? box
  const placement = placeNotice({
    anchor: { left: mark.left, right: mark.right, top: box.top, bottom: box.bottom },
    bounds,
    sheetWidth: sheet.offsetWidth,
    viewportHeight: globalThis.innerHeight,
    compact,
  })
  sheet.style.top = `${placement.top}px`
  sheet.style.left = `${placement.left}px`
  sheet.style.width = placement.width === null ? "" : `${placement.width}px`
  sheet.style.maxHeight = `${placement.maxHeight}px`
  sheet.style.setProperty("--notice-origin-x", `${placement.originX}px`)
}
