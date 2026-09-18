import { COMBINED_PER_HOUR_USD, RATE_CHECKED_ON, RATE_SOURCE_URL } from "./published-rate"

export const ESTIMATE_TITLE = "Estimated at the published rate"

export const READING_LABEL = "Estimate for this session at the published combined rate"

export const NOT_A_BILL =
  "An estimate, not a bill. It is elapsed socket time multiplied by a rate read off a public price page. We have no billing API, so nothing here has been reconciled against what AssemblyAI actually charged."

export const ABSENCE_NOTE =
  "No socket has been open in this browser yet, so there is no elapsed time to multiply. A zero would claim a session ran and cost nothing."

export const METHOD_LINE = `elapsed socket time in this browser multiplied by $${COMBINED_PER_HOUR_USD.toFixed(2)}/hr, the sum of three published rates checked on ${RATE_CHECKED_ON} at ${RATE_SOURCE_URL}`

export const WHY_COMBINED =
  "Both sockets are open at once, so all three rates apply over the same wall-clock minute. A counter showing the recognizer rate alone would understate this session by a factor of eleven."

export const DRIFT_NOTE =
  "If the price page has changed since the date above, the page is right and this figure is stale. The date is published so that can be checked rather than assumed."

export const CLAIM_WORDS: readonly string[] = Object.freeze([
  "billed",
  "charged you",
  "you owe",
  "invoice",
  "amount due",
  "total spend",
  "actual cost",
])

export const DENIAL_MARKERS: readonly string[] = Object.freeze([
  "estimate, not a bill",
  "no billing api",
])
