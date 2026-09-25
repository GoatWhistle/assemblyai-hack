export const BREAK = "|"

export const CALLER_LINES = {
  "order-clean":
    "Hi, this is doctor Alan Brown. NPI 1 2 3 4 5 6 7 8 9 3. DEA A B 1 2 3 4 5 6 3. The patient is Maria Lopez. Lisinopril, ten milligrams, tablet, by mouth, once daily, thirty tablets, no refills.",
  "order-lasa":
    "Hi, this is doctor Alan Brown. NPI 1 2 3 4 5 6 7 8 9 3. DEA A B 1 2 3 4 5 6 3. The patient is Maria Lopez. Hydromorphone, two milligrams per millilitre, injection, intravenous, every four hours as needed, ten vials, no refills.",
  "order-no-npi":
    "Hi, this is doctor Alan Brown. DEA A B 1 2 3 4 5 6 3. The patient is Maria Lopez. Lisinopril, ten milligrams, tablet, by mouth, once daily, thirty tablets, no refills.",
  "npi-groups": "My NPI is one two three four | five six seven | eight nine three.",
  yes: "Yes.",
  "yeah-no": "Yeah, no.",
  "name-hydromorphone": "Hydromorphone.",
  "barge-in": "Sorry, wait, one moment please.",
  "commit-early": "That is everything. Please submit the order now.",
} as const

export type CallerLineId = keyof typeof CALLER_LINES

export function lineFile(id: CallerLineId): string {
  return `tests/live/lines/${id}.wav`
}
