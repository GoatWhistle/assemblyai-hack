import { IntakeClient } from "./intake-client"

const MAIN_ID = "main"

export default function IntakePage() {
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
