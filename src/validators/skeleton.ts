const NON_ALPHA = /[^a-z]/g
const DIGRAPH = /ph/g
const VOWELS_AND_H = /[aeiouyh]/g

export type SkeletonSource = {
  namesForSkeleton(skeleton: string): readonly string[]
}

export type SkeletonNeighbour = {
  readonly skeleton: string
  readonly candidates: readonly string[]
}

export function consonantSkeleton(value: string): string {
  return value
    .toLowerCase()
    .replace(NON_ALPHA, "")
    .replace(DIGRAPH, "f")
    .replace(VOWELS_AND_H, "")
}

export function skeletonNeighbours(
  heard: string,
  source: SkeletonSource,
): SkeletonNeighbour | null {
  const skeleton = consonantSkeleton(heard)
  if (skeleton.length < 4) {
    return null
  }
  const heardKey = heard.trim().toLowerCase()
  const candidates = source
    .namesForSkeleton(skeleton)
    .filter((name) => name.trim().toLowerCase() !== heardKey)
  if (candidates.length === 0) {
    return null
  }
  return { skeleton, candidates: Object.freeze([...candidates]) }
}
