import type { ReactNode } from "react"

export type IconProps = {
  readonly className?: string
}

export type ArrowDirection = "left" | "right" | "up"

const ARROW_PATH: Readonly<Record<ArrowDirection, string>> = {
  left: "M13 8H3m4-4L3 8l4 4",
  right: "M3 8h10m-4-4 4 4-4 4",
  up: "M8 13V3M4 7l4-4 4 4",
}

function Glyph({ className, children }: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function ArrowIcon({
  className,
  direction,
}: IconProps & { readonly direction: ArrowDirection }) {
  return (
    <Glyph className={className}>
      <path d={ARROW_PATH[direction]} />
    </Glyph>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M6 4l4 4-4 4" />
    </Glyph>
  )
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M9.5 3H13v3.5M13 3 7.5 8.5M11.5 9.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h2.5" />
    </Glyph>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M8 2.5v7.5M4.5 6.5 8 10l3.5-3.5M3 13h10" />
    </Glyph>
  )
}

export function CopyIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
      <path d="M10.5 3.5V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h.5" />
    </Glyph>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </Glyph>
  )
}
