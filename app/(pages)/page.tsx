import type { Metadata } from "next"
import { CALL_MAIN_ID } from "@/features/intake/intake-screen/landmarks"
import { pageMetadata } from "@/site/page-metadata"
import { StructuredData } from "@/site/structured-data"
import { IntakeClient } from "./intake-client"

export const metadata: Metadata = pageMetadata({
  title: "Readback | Prescription intake that proves it did not mishear",
  absoluteTitle: true,
  description:
    "Dictate a prescription to a voice agent. Every value is proved by a validator or confirmed aloud before it can enter the order, and a look-alike drug name is asked again even at recognizer certainty 1.00.",
  path: "/",
})

export default function CallPage() {
  return (
    <>
      <a className="skip-link" href={`#${CALL_MAIN_ID}`}>
        Skip to the call
      </a>
      <IntakeClient />
      <StructuredData />
    </>
  )
}
