import styles from "./styles.module.css"

export type EmptyMarkKind = "words" | "question" | "receipt"

export type EmptyMarkProps = {
  readonly kind: EmptyMarkKind
}

function Ruler() {
  return (
    <g className={styles.ruler}>
      <path d="M4 34h88" />
      <path d="M4 31v6M26 32v4M48 31v6M70 32v4M92 31v6" />
    </g>
  )
}

function Words() {
  return (
    <>
      <rect className={styles.pill} x="8" y="12" width="24" height="12" rx="4" />
      <rect className={styles.pill} x="36" y="12" width="32" height="12" rx="4" />
      <rect className={styles.pill} x="72" y="12" width="16" height="12" rx="4" />
      <Ruler />
      <path className={styles.accent} d="M6 8v28" />
    </>
  )
}

function Question() {
  return (
    <>
      <rect className={styles.pill} x="6" y="8" width="34" height="13" rx="4" />
      <rect className={styles.pill} x="56" y="8" width="34" height="13" rx="4" />
      <path className={styles.pair} d="M23 25v5h50v-5" />
    </>
  )
}

function Receipt() {
  return (
    <>
      <path className={styles.sheet} d="M4 3h36v34l-6-3-6 3-6-3-6 3-6-3-6 3z" />
      <path className={styles.ruler} d="M10 12h24M10 18h24M10 24h14" />
      <rect className={styles.seal} x="28" y="21" width="22" height="11" rx="2" />
    </>
  )
}

const DRAWING = { words: Words, question: Question, receipt: Receipt } as const

export function EmptyMark({ kind }: EmptyMarkProps) {
  const Drawing = DRAWING[kind]
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 96 40"
      aria-hidden="true"
      focusable="false"
      data-kind={kind}
    >
      <Drawing />
    </svg>
  )
}
