export function motionToken(name: string): string {
  const root = globalThis.document?.documentElement
  return root === undefined
    ? ""
    : globalThis.getComputedStyle(root).getPropertyValue(name).trim()
}

export function motionMs(name: string): number {
  const value = Number.parseFloat(motionToken(name))
  return Number.isFinite(value) ? value : 0
}
