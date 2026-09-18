import { useId } from "react"

const BEAT = "M11.8 11.4 h1.6 l1.4 -3.2 1.8 6 1.4 -3.6 h1.8"

export type WordmarkProps = {
  readonly size?: number
}

export function Wordmark({ size = 22 }: WordmarkProps) {
  const maskId = useId()

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white" />
          <path
            d={BEAT}
            fill="none"
            stroke="black"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <rect
        x="10.5"
        y="2.5"
        width="11"
        height="17"
        rx="5.5"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 15.5 a9.5 9.5 0 0 0 19 0" strokeWidth="2.8" />
        <path d="M16 24.5 V29.5" strokeWidth="2.8" />
      </g>
    </svg>
  )
}
