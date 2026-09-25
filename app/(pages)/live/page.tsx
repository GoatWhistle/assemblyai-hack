import type { Metadata } from "next"
import { IntakeClient } from "./intake-client"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Live intake",
  description:
    "Dictate a prescription to the voice agent over two live sockets. Every value is proved by a validator or confirmed aloud before it can enter the order.",
}

export default function LivePage() {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the order
      </a>
      <main id={MAIN_ID}>
        <IntakeClient />
      </main>
    </>
  )
}
