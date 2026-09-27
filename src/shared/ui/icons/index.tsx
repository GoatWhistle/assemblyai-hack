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

export function DocumentIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M4 2.5h4.75L12 5.75v7.75H4z" />
      <path d="M8.5 2.5v3.5H12M6 9h4M6 11.25h2.5" />
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

const GITHUB_MARK =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"

export function GitHubIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={GITHUB_MARK} />
    </svg>
  )
}
