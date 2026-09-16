import Link from "next/link"
import { MetricsDashboard } from "@/features/metrics/metrics-dashboard"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./metrics-page.module.css"

const MAIN_ID = "main"

export default function MetricsPage() {
  return (
    <main className={styles.page} id={MAIN_ID}>
      <nav className={styles.nav} aria-label="Other views">
        <Link href="/">Intake</Link>
        <Link href="/demo">Recorded demonstration</Link>
      </nav>
      <MetricsDashboard />
      <Disclaimer />
    </main>
  )
}
