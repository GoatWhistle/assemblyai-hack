import styles from "./styles.module.css"

const COLUMNS = [
  {
    step: "The rule",
    lead: "Read-back is already required",
    points: ["ICAO Annex 11 §3.7.3.1", "Joint Commission NPSG.02.01.01"],
  },
  {
    step: "The buyer",
    lead: "Whoever owns the regulatory risk",
    points: ["Pharmacy chains and delivery", "Telehealth and insurer call centres"],
  },
  {
    step: "The price",
    lead: "Proof, per line and per field",
    points: [
      "Subscription per intake line",
      "Price per verified field",
      "Receipt as the audit trail",
    ],
  },
] as const

export function BuyerSlide() {
  return (
    <div className={styles.layout}>
      <ol className={styles.columns}>
        {COLUMNS.map((column) => (
          <li className={styles.column} key={column.step}>
            <p className={styles.step}>{column.step}</p>
            <p className={styles.lead}>{column.lead}</p>
            <ul className={styles.points}>
              {column.points.map((point) => (
                <li className={styles.point} key={point}>
                  {point}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
