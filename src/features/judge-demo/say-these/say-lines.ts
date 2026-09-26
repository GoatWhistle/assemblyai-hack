export type SayLineId = "clean" | "lasa" | "npi"

export const SAY_LINES: Readonly<Record<SayLineId, string>> = Object.freeze({
  clean: "Lisinopril, ten milligrams, one tablet by mouth once daily, thirty tablets.",
  lasa: "Hydromorphone, two milligrams.",
  npi: "Prescriber NPI one two three four five six seven eight nine zero.",
})

export const SAY_LINE_ORDER: readonly SayLineId[] = Object.freeze(["clean", "lasa", "npi"])
