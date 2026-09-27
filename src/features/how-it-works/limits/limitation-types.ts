export type LimitationGroup = "trust" | "evidence" | "operations"

export type LimitationStanding = "measured" | "enforced" | "assumed" | "admitted" | "disclosed"

export type Limitation = {
  readonly id: string
  readonly group: LimitationGroup
  readonly title: string
  readonly standing: LimitationStanding
  readonly status: string
  readonly body: string
  readonly points?: readonly string[]
  readonly pointsLabel?: string
  readonly link?: { readonly href: string; readonly label: string }
}
