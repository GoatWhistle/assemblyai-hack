import { ATTACKS } from "@/features/attack-console/attack-list"
import styles from "./styles.module.css"

const FACTS = [
  { value: "1", label: "constructor can write a field" },
  { value: "12 / 12", label: "gate branches caught by mutation tests" },
  { value: "hold", label: "commit waits for the server's verdict" },
] as const

export function InvariantSlide() {
  return (
    <div className={styles.layout}>
      <section className={styles.console} aria-label="The attack console">
        <p className={styles.consoleHead}>
          attack console · {ATTACKS.length} attempts · nothing written
        </p>
        <ol className={styles.attacks}>
          {ATTACKS.map((attack) => (
            <li className={styles.attack} key={attack.id}>
              <span className={styles.attackTitle}>{attack.title}</span>
              <span className={styles.refused}>refused</span>
            </li>
          ))}
        </ol>
      </section>

      <ul className={styles.facts}>
        {FACTS.map((fact) => (
          <li className={styles.fact} key={fact.label}>
            <p className={styles.value}>{fact.value}</p>
            <p className={styles.label}>{fact.label}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
