import styles from "./styles.module.css"

type Lane = {
  readonly name: string
  readonly where: string
  readonly nodes: readonly { readonly title: string; readonly detail: string }[]
  readonly vendor?: boolean
}

const BROWSER: Lane = {
  name: "Browser",
  where: "the caller's tab",
  nodes: [
    { title: "Microphone", detail: "echo cancelled" },
    { title: "Field cards", detail: "words, timecodes, verdict" },
  ],
}

const VENDOR: Lane = {
  name: "AssemblyAI",
  where: "two sockets",
  vendor: true,
  nodes: [
    { title: "Streaming STT", detail: "universal-3-5-pro, word confidence" },
    { title: "Voice Agent API", detail: "speaks, calls our tools" },
  ],
}

const SERVER: Lane = {
  name: "Our server",
  where: "Vercel, no proxy",
  nodes: [
    { title: "Tokens", detail: "the key never leaves" },
    { title: "Gate", detail: "commit_order in hold" },
    { title: "Receipt", detail: "witnessed by the vendor" },
  ],
}

const LINKS = ["wss, short-lived token", "HTTPS tool calls"] as const

function LaneView({ lane }: { readonly lane: Lane }) {
  return (
    <section className={lane.vendor ? `${styles.lane} ${styles.vendor}` : styles.lane}>
      <header className={styles.laneHead}>
        <p className={styles.laneName}>{lane.name}</p>
        <p className={styles.where}>{lane.where}</p>
      </header>
      <ul className={styles.nodes}>
        {lane.nodes.map((node) => (
          <li className={styles.node} key={node.title}>
            <p className={styles.nodeTitle}>{node.title}</p>
            <p className={styles.detail}>{node.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StackSlide() {
  return (
    <div className={styles.diagram}>
      <LaneView lane={BROWSER} />
      <p className={styles.link}>
        <span className={styles.arrow} aria-hidden="true" />
        {LINKS[0]}
      </p>
      <LaneView lane={VENDOR} />
      <p className={styles.link}>
        <span className={styles.arrow} aria-hidden="true" />
        {LINKS[1]}
      </p>
      <LaneView lane={SERVER} />
    </div>
  )
}
