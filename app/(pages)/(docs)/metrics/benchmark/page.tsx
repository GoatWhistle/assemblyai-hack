import type { Metadata } from "next"
import Link from "next/link"
import { benchmarkEntries } from "@/features/metrics/benchmark-row"
import { BENCHMARK_CAPTION, BenchmarkTable } from "@/features/metrics/benchmark-table"
import { reportEntries } from "@/features/metrics/policy-figures"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { BENCHMARK_AGREEMENT_NOTE } from "@/stats"
import { BENCHMARK_SECTIONS } from "../../docs-map"

const AGREEMENT = `${BENCHMARK_AGREEMENT_NOTE.charAt(0).toUpperCase()}${BENCHMARK_AGREEMENT_NOTE.slice(1)}.`

export const metadata: Metadata = {
  title: "Benchmark",
  description:
    "Every recognizer and gate figure with its input, command, set size and date, and a dash where nothing was measured.",
}

export default function BenchmarkPage() {
  const entries = benchmarkEntries()
  const measured = entries.filter((entry) => entry.row.value !== null)
  const unmeasured = entries.filter((entry) => entry.row.value === null)
  return (
    <>
      <DocHeader
        trail={<Link href="/metrics">Measurements</Link>}
        title="Benchmark"
        lede={BENCHMARK_CAPTION}
      />

      <DocSection
        id={BENCHMARK_SECTIONS.measured.id}
        title="Measured on recorded runs"
        lead="Recorded runs of synthesised speech through the live recognizer, scored for the drug name and replayed through the real validator and gate."
      >
        <BenchmarkTable
          entries={measured}
          label="Measured benchmark figures"
          caption="Measured figures, each with its command, set size and date."
        />
      </DocSection>

      <DocSection
        id={BENCHMARK_SECTIONS.unmeasured.id}
        title="Not measured yet"
        lead="Each of these reads as a dash. A named target means the run costs credit and has not been spent; no command yet means nothing computes the figure."
      >
        <BenchmarkTable
          entries={unmeasured}
          label="Figures not measured yet"
          caption="Figures not measured yet, with what would produce each one."
        />
      </DocSection>

      <DocSection
        id={BENCHMARK_SECTIONS.report.id}
        title="Further figures from the report"
        lead={AGREEMENT}
      >
        <BenchmarkTable
          entries={reportEntries()}
          label="Further report figures"
          caption="Checksum audits, calibration, rarity and human-voice rows the server publishes beside the shipped policy."
        />
      </DocSection>
    </>
  )
}
