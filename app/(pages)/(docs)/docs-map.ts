import type { DocsPage, DocsSection } from "@/shared/ui/navigation/docs-tree"

function section(id: string, label: string): DocsSection {
  return Object.freeze({ id, label })
}

export const OVERVIEW_SECTIONS = Object.freeze({
  claim: section("claim", "The hard claim"),
  reasons: section("reasons", "Three reasons to re-ask"),
  map: section("map", "Map of the docs"),
  numbers: section("numbers", "Key numbers"),
})

export const HOW_SECTIONS = Object.freeze({
  reasons: section("reasons", "Three reasons"),
  proof: section("proof", "Proof per field"),
  script: section("script", "Seven-minute script"),
  attack: section("attack", "Attack console"),
  limits: section("limits", "What it does not prove"),
})

export const COMPARE_SECTIONS = Object.freeze({
  moments: section("moments", "Six moments"),
  source: section("source", "Where the rows come from"),
})

export const METRICS_SECTIONS = Object.freeze({
  headline: section("headline", "Headline figure"),
  policy: section("policy", "Shipped policy"),
  discipline: section("discipline", "Held-out discipline"),
  more: section("more", "More measurements"),
})

export const BENCHMARK_SECTIONS = Object.freeze({
  measured: section("measured", "Measured"),
  unmeasured: section("unmeasured", "Not measured yet"),
  report: section("report", "Further report figures"),
})

export const OPERATIONS_SECTIONS = Object.freeze({
  business: section("business", "Business reading"),
  closeCodes: section("close-codes", "Socket close codes"),
})

export const BENCHMARK_PAGE: DocsPage = Object.freeze({
  href: "/metrics/benchmark",
  label: "Benchmark",
  title: "Benchmark",
  summary:
    "Every recognizer and gate figure with its input, command, set size and date, including the ones not measured yet.",
  sections: Object.values(BENCHMARK_SECTIONS),
})

export const OPERATIONS_PAGE: DocsPage = Object.freeze({
  href: "/metrics/operations",
  label: "Cost and operations",
  title: "Cost and operations",
  summary:
    "What the gate would cost per order, why no figure is published yet, and the socket close codes counted from recorded sessions.",
  sections: Object.values(OPERATIONS_SECTIONS),
})

export const DOCS_PAGES: readonly DocsPage[] = Object.freeze([
  Object.freeze({
    href: "/docs",
    label: "Overview",
    title: "How Readback proves it did not mishear",
    summary: "What Readback is, the claim it rests on, and the numbers behind it.",
    sections: Object.values(OVERVIEW_SECTIONS),
  }),
  Object.freeze({
    href: "/how-it-works",
    label: "How it works",
    title: "A value enters the order only after it is proved",
    summary:
      "The three reasons the gate asks again, what counts as proof per field, a seven-minute script, a console for trying to forge a value, and the limits.",
    sections: Object.values(HOW_SECTIONS),
  }),
  Object.freeze({
    href: "/compare",
    label: "Compare",
    title: "What the gate changes, one moment at a time",
    summary:
      "Six synthesised moments decided by the shipped gate, beside what a confidence threshold alone would have written.",
    sections: Object.values(COMPARE_SECTIONS),
  }),
  Object.freeze({
    href: "/metrics",
    label: "Measurements",
    title: "Measurements",
    summary:
      "The headline figure, the shipped policy's measured rows and the held-out discipline, each with its command and set size.",
    sections: Object.values(METRICS_SECTIONS),
    children: Object.freeze([BENCHMARK_PAGE, OPERATIONS_PAGE]),
  }),
])
