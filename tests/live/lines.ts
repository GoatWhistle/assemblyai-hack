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
  patient: "The patient is Maria Lopez.",
  npi: "The NPI is 1 2 3 4 5 6 7 8 9 3.",
  dea: "The DEA number is A B 1 2 3 4 5 6 3.",
  "drug-clean": "Lisinopril, ten milligrams, tablet, by mouth.",
  "strength-clean": "Ten milligrams.",
  "form-clean": "Tablet.",
  "route-clean": "By mouth.",
  "quantity-clean": "Thirty tablets.",
  "sig-clean": "Once daily.",
  "days-clean": "Thirty days supply.",
  "drug-lasa": "Hydromorphone, two milligrams per millilitre, injection, intravenous.",
  "strength-lasa": "Two milligrams per millilitre.",
  "form-lasa": "Injection.",
  "route-lasa": "Intravenous.",
  "quantity-lasa": "Ten vials.",
  "sig-lasa": "Every four hours as needed.",
  "days-lasa": "Three days supply.",
  refills: "No refills.",
} as const

export type CallerLineId = keyof typeof CALLER_LINES

export function isCallerLine(id: string): id is CallerLineId {
  return Object.hasOwn(CALLER_LINES, id)
}

export function lineFile(id: CallerLineId): string {
  return `tests/live/lines/${id}.wav`
}
