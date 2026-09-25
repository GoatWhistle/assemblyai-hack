export type BusinessFigure = {
  readonly id: string
  readonly figure: string
  readonly unit: string
  readonly value: string | null
  readonly needs: string
}

export const BUSINESS_FIGURES: readonly BusinessFigure[] = [
  {
    id: "re-ask-seconds-per-order",
    figure: "Re-ask cost",
    unit: "pharmacist seconds per order",
    value: null,
    needs:
      "the seconds one re-ask costs on a live call and the number of re-asks per finished live order. Neither is measured: turn-to-turn time needs make measure, which has not been run, and no live order has been recorded.",
  },
  {
    id: "catches-per-thousand-orders",
    figure: "Wrong values caught",
    unit: "catches per 1000 orders",
    value: null,
    needs:
      "how many wrong values reach the gate per finished live order. The recorded runs count errors per synthesised utterance, not per order, and scaling one into the other would be a number without a method.",
  },
]

export const COST_OF_ERROR_NOTE =
  "No cost of a dispensing error is shown. Publishing one needs a cited source, and none is cited on this page."
