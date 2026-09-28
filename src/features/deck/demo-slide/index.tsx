import { ConfirmationReason, PAIR_RULE_FLAG } from "@/domain"
import { DEMO_ARMS, type DemoArm } from "@/features/judge-demo/demo-arms"
import styles from "./styles.module.css"

function question(arm: DemoArm): string {
  const line = arm.agentLine
  return line.includes("Which:") ? line.slice(line.indexOf("Which:")) : line
}

function Arm({ arm }: { readonly arm: DemoArm }) {
  const shipped = arm.policy[PAIR_RULE_FLAG]
  return (
    <article className={shipped ? `${styles.arm} ${styles.on}` : `${styles.arm} ${styles.off}`}>
      <header className={styles.head}>
        <span className={styles.toggle} aria-hidden="true">
          <span className={styles.knob} />
        </span>
        <span className={styles.title}>{arm.title}</span>
        <span className={styles.tag}>{shipped ? "shipped" : "comparison only"}</span>
      </header>
      <div className={styles.turn}>
        <p className={styles.who}>Agent</p>
        <p className={styles.said}>&ldquo;{question(arm)}&rdquo;</p>
      </div>
      <div className={styles.turn}>
        <p className={styles.who}>Caller</p>
        <p className={styles.said}>&ldquo;{arm.answer.callerSaid}&rdquo;</p>
      </div>
      <div className={styles.result}>
        <p className={styles.who}>{arm.outcomeLabel}</p>
        <p className={styles.ordered}>{arm.value.settled}</p>
      </div>
    </article>
  )
}

export function DemoSlide() {
  return (
    <div className={styles.layout}>
      <div className={styles.arms}>
        {DEMO_ARMS.map((arm) => (
          <Arm arm={arm} key={arm.id} />
        ))}
      </div>
      <p className={styles.note}>
        A synthesised session · the arms differ by one policy flag, {PAIR_RULE_FLAG} · a yes to
        the pair question returns{" "}
        <code className={styles.inline}>{ConfirmationReason.LasaNamedAnswerRequired}</code>
      </p>
    </div>
  )
}
