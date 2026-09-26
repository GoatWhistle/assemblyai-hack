import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import { CALL_MAIN_ID } from "@/features/intake/intake-screen/landmarks"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { IntakeClient } from "./intake-client"

export const metadata: Metadata = {
  title: { absolute: "Readback: prescription intake that proves it did not mishear" },
  description:
    "Dictate a prescription to a voice agent. Every value is proved by a validator or confirmed aloud before it can enter the order, and a look-alike drug name is asked again even at recognizer certainty 1.00.",
}

type CallPageProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CallPage({ searchParams }: CallPageProps) {
  const params = await searchParams
  if (params.judge === "1") {
    permanentRedirect(REPLAY_ENTRY_HREF)
  }
  return (
    <>
      <a className="skip-link" href={`#${CALL_MAIN_ID}`}>
        Skip to the call
      </a>
      <IntakeClient />
    </>
  )
}
