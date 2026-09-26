import type { Metadata } from "next"
import { OrderPageView } from "@/features/receipt/order-page"

export const metadata: Metadata = {
  title: "Check a receipt file",
  description:
    "Recheck a downloaded order receipt in the browser: the sha256 over its canonical JSON, the NPI and DEA check digits, and the published look-alike pairs.",
  robots: { index: false },
}

export default function OrderIndexPage() {
  return <OrderPageView sessionId={null} />
}
