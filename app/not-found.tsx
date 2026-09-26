import type { Metadata } from "next"
import { NotFoundScreen } from "@/features/not-found"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
}

export default function NotFound() {
  return <NotFoundScreen />
}
