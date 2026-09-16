import Link from "next/link"
import { JudgeDemo } from "@/features/judge-demo"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./demo-page.module.css"

const MAIN_ID = "main"

export default function DemoPage() {
  return (
    <main className={styles.page} id={MAIN_ID}>
      <nav className={styles.nav} aria-label="Other views">
        <Link href="/">Intake</Link>
        <Link href="/metrics">Measurements</Link>
      </nav>
      <JudgeDemo />
      <Disclaimer />
    </main>
  )
}
