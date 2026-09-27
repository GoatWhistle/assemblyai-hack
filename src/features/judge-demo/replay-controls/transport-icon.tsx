export type TransportGlyph = "play" | "pause" | "stop" | "again"

const PATHS: Readonly<Record<TransportGlyph, string>> = Object.freeze({
  play: "M5 3.5v9l7.5-4.5z",
  pause: "M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z",
  stop: "M4 4h8v8H4z",
  again: "M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.8h2.8",
})

export function TransportIcon({ glyph }: { readonly glyph: TransportGlyph }) {
  const outline = glyph === "again"
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={PATHS[glyph]}
        fill={outline ? "none" : "currentColor"}
        stroke={outline ? "currentColor" : "none"}
        strokeWidth={outline ? 1.6 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
