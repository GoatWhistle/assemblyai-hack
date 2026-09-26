import { type Cited, PUBLIC_DOCUMENTS } from "./public-figure-anchor"

export const VENDOR_SOURCES = "docs/sources.md"

const VENDOR =
  "AssemblyAI's own published figure (Universal-3.5 Pro Realtime and The Voice Agent Accuracy Problem Nobody Benchmarks), quoted with its source in docs/sources.md and never re-measured by this repository"

export const VENDOR_FIGURES: readonly string[] = [
  "15.31%",
  "6.99%",
  "16.92%",
  "84.69%",
  "43.6%",
  "44.0%",
  "70%",
  "95.4%",
  "79.1%",
]

export const VENDOR_CITED: readonly Cited[] = PUBLIC_DOCUMENTS.flatMap((document) =>
  VENDOR_FIGURES.map((figure) => ({ document, figure, reason: VENDOR })),
)

export const OWN_CITED: readonly Cited[] = []

export const CITED: readonly Cited[] = [...VENDOR_CITED, ...OWN_CITED]
