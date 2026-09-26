import { permanentRedirect } from "next/navigation"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"

export default function StartPage(): never {
  permanentRedirect(REPLAY_ENTRY_HREF)
}
