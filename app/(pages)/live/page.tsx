import { permanentRedirect } from "next/navigation"
import { CALL_HREF } from "@/features/judge-demo/entry-routes"

export default function LivePage(): never {
  permanentRedirect(CALL_HREF)
}
