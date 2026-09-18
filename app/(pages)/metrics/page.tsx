import type { Metadata } from "next"
import { MetricsDashboard } from "@/features/metrics/metrics-dashboard"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Measurements",
  description:
    "Every figure carries the command that produced it and the size of the set it came from.",
}

export default function MetricsPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader current="metrics" />
      <main className={styles.page} id={MAIN_ID}>
        <MetricsDashboard />
        <Disclaimer />
      </main>
    </div>
  )
}
