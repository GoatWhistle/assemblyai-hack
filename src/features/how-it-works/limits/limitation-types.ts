export type LimitationGroup = "trust" | "evidence" | "operations"

export type Limitation = {
  readonly id: string
  readonly group: LimitationGroup
  readonly title: string
  readonly status: string
  readonly body: string
  readonly points?: readonly string[]
  readonly link?: { readonly href: string; readonly label: string }
}
