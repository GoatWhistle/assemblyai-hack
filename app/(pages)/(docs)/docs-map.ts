import type { DocsPage, DocsSection } from "@/shared/ui/navigation/docs-tree"

function section(id: string, label: string): DocsSection {
  return Object.freeze({ id, label })
}

export const OVERVIEW_SECTIONS = Object.freeze({
  claim: section("claim", "Certainty cannot tell names apart"),
  reasons: section("reasons", "When the agent asks again"),
  numbers: section("numbers", "The catch and its cost"),
})

export const HOW_SECTIONS = Object.freeze({
  reasons: section("reasons", "When the agent asks again"),
  proof: section("proof", "Proof per field"),
  script: section("script", "Extended script"),
  attack: section("attack", "Attack console"),
  limits: section("limits", "What it does not prove"),
})

export const COMPARE_SECTIONS = Object.freeze({
  moments: section("moments", "Six moments"),
  source: section("source", "Where the rows come from"),
})

export const METRICS_SECTIONS = Object.freeze({
  headline: section("headline", "Catch and cost"),
  policy: section("policy", "Shipped policy"),
  discipline: section("discipline", "Held-out result"),
  more: section("more", "More measurements"),
})

export const BENCHMARK_SECTIONS = Object.freeze({
  measured: section("measured", "Recognizer errors"),
  unmeasured: section("unmeasured", "Not measured yet"),
  report: section("report", "Checksums and calibration"),
})

export const OPERATIONS_SECTIONS = Object.freeze({
  rates: section("rates", "Published rates"),
  business: section("business", "Cost per order"),
  closeCodes: section("close-codes", "Socket close codes"),
})

export const LIMITATIONS_SECTIONS = Object.freeze({
  trust: section("trust", "Trust boundary"),
  evidence: section("evidence", "Evidence"),
  operations: section("operations", "Operations and use"),
})

export const THREAT_SECTIONS = Object.freeze({
  browser: section("browser", "What the browser supplies"),
  witness: section("witness", "The vendor witness"),
  receipt: section("receipt", "Checking a receipt"),
})

export const GLOSSARY_SECTIONS = Object.freeze({
  terms: section("terms", "Terms"),
  citations: section("citations", "Citations"),
})

export const BENCHMARK_PAGE: DocsPage = Object.freeze({
  href: "/metrics/benchmark",
  label: "Benchmark",
  title: "Benchmark",
  summary:
    "Every recognizer and gate figure with its input, command and set size, including the ones not measured yet.",
  sections: Object.values(BENCHMARK_SECTIONS),
})

export const OPERATIONS_PAGE: DocsPage = Object.freeze({
  href: "/metrics/operations",
  label: "Cost and operations",
  title: "Cost and operations",
  summary:
    "What the gate would cost per order, why no figure is published yet, and the socket close codes, each labelled as an observation with its source.",
  sections: Object.values(OPERATIONS_SECTIONS),
})

export const LIMITATIONS_PAGE: DocsPage = Object.freeze({
  href: "/docs/limitations",
  label: "Limitations",
  title: "Limitations",
  summary:
    "Everything this project cannot prove, each with its status: measured, enforced, assumed, or false and admitted.",
  sections: Object.values(LIMITATIONS_SECTIONS),
})

export const THREAT_PAGE: DocsPage = Object.freeze({
  href: "/docs/threat-model",
  label: "Threat model and receipts",
  title: "Threat model and receipts",
  summary:
    "What the browser supplies, what the vendor's own transcript witnesses, what neither proves, and how to check a sealed receipt.",
  sections: Object.values(THREAT_SECTIONS),
})

export const GLOSSARY_PAGE: DocsPage = Object.freeze({
  href: "/docs/glossary",
  label: "Glossary",
  title: "Glossary",
  summary:
    "LASA, NDC, NPI, DEA, sig, keyterms, provenance and the other terms these pages use, plus the exact citations behind read-back.",
  sections: Object.values(GLOSSARY_SECTIONS),
})

export const DOCS_PAGES: readonly DocsPage[] = Object.freeze([
  Object.freeze({
    href: "/docs",
    label: "Overview",
    title: "How Readback proves it did not mishear",
    summary: "What Readback is, the claim it rests on, and the catch and cost behind it.",
    sections: Object.values(OVERVIEW_SECTIONS),
  }),
  Object.freeze({
    href: "/how-it-works",
    label: "How it works",
    title: "A value enters the order only after it is proved",
    summary:
      "When the gate asks again, what counts as proof per field, an extended script, a console for trying to forge a value, and the limits.",
    sections: Object.values(HOW_SECTIONS),
  }),
  Object.freeze({
    href: "/compare",
    label: "Compare",
    title: "What the pair rule and read-back change, one moment at a time",
    summary:
      "Six synthesised moments decided by the shipped gate, beside what a threshold and the validators alone would have written.",
    sections: Object.values(COMPARE_SECTIONS),
  }),
  Object.freeze({
    href: "/metrics",
    label: "Measurements",
    title: "Measurements",
    summary:
      "What the pair rule catches beside what it costs, the shipped policy's rows and the held-out result, each with its command and set size.",
    sections: Object.values(METRICS_SECTIONS),
    children: Object.freeze([BENCHMARK_PAGE, OPERATIONS_PAGE]),
  }),
  LIMITATIONS_PAGE,
  THREAT_PAGE,
  GLOSSARY_PAGE,
])
