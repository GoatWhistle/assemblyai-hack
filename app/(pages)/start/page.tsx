import { redirect } from "next/navigation"

export default function StartPage(): never {
  redirect("/?judge=1#replay")
}
