export type SessionMode =
  | { readonly kind: "live" }
  | {
      readonly kind: "replay"
      readonly recordedOn: string
      readonly source: "live" | "synthesised"
    }

export function modeLabel(mode: SessionMode): string {
  if (mode.kind === "live") {
    return "Live: two sockets"
  }
  return mode.source === "live"
    ? `Replay: recorded live on ${mode.recordedOn}`
    : `Replay: synthesised session dated ${mode.recordedOn}`
}
