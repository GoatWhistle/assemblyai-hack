export type SectionBox = {
  readonly id: string
  readonly top: number
}

export function activeHubSection(
  boxes: readonly SectionBox[],
  line: number,
  atBottom: boolean,
): string | null {
  if (boxes.length === 0) {
    return null
  }
  if (atBottom) {
    return boxes.at(-1)?.id ?? null
  }
  let active: string | null = null
  for (const box of boxes) {
    if (box.top <= line) {
      active = box.id
    }
  }
  return active
}
