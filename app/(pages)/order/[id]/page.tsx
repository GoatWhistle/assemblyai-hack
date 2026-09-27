import type { Metadata } from "next"
import { OrderPageView } from "@/features/receipt/order-page"
import { pageMetadata } from "@/site/page-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Order receipt",
  description:
    "A committed order's receipt, rechecked in the browser: the sha256 over its canonical JSON, the NPI and DEA check digits, and the published look-alike pairs.",
  robots: { index: false },
})

type OrderPageProps = {
  readonly params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params
  return <OrderPageView sessionId={decodeURIComponent(id)} />
}
