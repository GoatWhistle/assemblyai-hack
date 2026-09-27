import type { Metadata } from "next"
import { OrderPageView } from "@/features/receipt/order-page"
import { pageMetadata } from "@/site/page-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Check a receipt file",
  description:
    "Recheck a downloaded order receipt in the browser: the sha256 over its canonical JSON, the NPI and DEA check digits, and the published look-alike pairs.",
  robots: { index: false },
  path: "/order",
})

export default function OrderIndexPage() {
  return <OrderPageView sessionId={null} />
}
