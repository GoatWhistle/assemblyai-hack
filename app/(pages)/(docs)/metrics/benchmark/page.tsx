import type { Metadata } from "next"
import Link from "next/link"
import { benchmarkEntries } from "@/features/metrics/benchmark-row"
import { BENCHMARK_CAPTION, BenchmarkTable } from "@/features/metrics/benchmark-table"
import { reportEntries } from "@/features/metrics/policy-figures"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DocSection } from "@/shared/ui/navigation/doc-section"
import { BENCHMARK_AGREEMENT_NOTE } from "@/stats"
import { BENCHMARK_SECTIONS } from "../../docs-map"
import styles from "./styles.module.css"

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
        title="What the recognizer got wrong, and how confident it was"
        lead="Recorded runs of synthesised speech through the live recognizer, scored for the drug name and replayed through the real validator and gate. Brackets are 95% Wilson intervals."
      >
        <BenchmarkTable
          entries={measured}
          label="Measured benchmark figures"
          caption="Measured figures, each with its command, set size and date."
        />
      </DocSection>

      <DocSection
        id={BENCHMARK_SECTIONS.unmeasured.id}
        title="Not measured yet, and what would measure each one"
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
        title="Checksums, calibration and rarity"
        lead={AGREEMENT}
      >
        <BenchmarkTable
          entries={reportEntries()}
          label="Further report figures"
          caption="Checksum audits, calibration, rarity and human-voice rows the server publishes beside the shipped policy."
        />
        <div className={styles.independent}>
          <p className={styles.title}>Independent: another team measured the same effect</p>
          <p className={styles.body}>
            A competing submission published a live run in which the recognizer returned a
            three-word homophone of a two-word business name. The word-level confidences on the
            wrong words were 0.408 and 0.385 while the turn-level confidence was 0.882: a turn
            can read as confident while the words that matter are not, which is why the gate
            takes the minimum across the source words rather than the mean. It does not prove
            the pair rule, because low word confidence caught that error; the case the pair rule
            exists for rests on our own four above-threshold errors. Observed 17 September 2026
            and recorded in eval/REPORT.md; we did not reproduce the run.
          </p>
        </div>
      </DocSection>
    </>
  )
}
