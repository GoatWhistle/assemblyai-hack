import { ismpPairCount, LASA_PAIRS } from "@/lasa"

export type DeckSlide = {
  readonly id: string
  readonly title: string
  readonly body: readonly string[]
  readonly source?: string
}

const PAIR_COUNT = LASA_PAIRS.length

const ISMP_COUNT = ismpPairCount()

export const SLIDES: readonly DeckSlide[] = [
  {
    id: "title",
    title: "Readback",
    body: [
      "A voice agent that takes a prescription over the phone and proves it did not mishear.",
      "A technology demonstration, not a medical device. Synthetic data only.",
    ],
  },
  {
    id: "problem",
    title: "The problem, in the vendor's own numbers",
    body: [
      "For Universal-3.5 Pro Realtime, AssemblyAI publishes an Entity Error Rate of 15.31% at a WER of 6.99%, and 16.92% in the benchmark's names category.",
      "Then it multiplies: at 84.69% entity capture per turn, a five-turn conversation comes through clean 43.6% of the time. If every entity is read back and the caller catches 70% of errors, 79.1%: the vendor's projection, not a measurement.",
      "These are not our measurements, they are the vendor's benchmark. The problem exists before us.",
    ],
    source:
      "AssemblyAI, Universal-3.5 Pro Realtime (23 June 2026) and The Voice Agent Accuracy Problem Nobody Benchmarks (8 September 2026); not measured by us",
  },
  {
    id: "breaks",
    title: "What exactly breaks",
    body: [
      "The recognizer can be certain and wrong at the same time.",
      "Suppose the prescriber says hydromorphone and the recognizer returns morphine at confidence 1.0, the case our synthesised replay stages. Both drugs exist and pass the catalogue check, and ISMP's 2017 verbal-order alert records exactly this mishearing between people: a nurse heard an order for hydromorphone as morphine.",
      "A confidence threshold does not save you here: the confidence is high. A plain read-back does not either: a caller who hears morphine read back can say yes by reflex. What saves you is a published list of confused names and a question the caller can only answer with a name.",
    ],
    source:
      "the synthesised replay at /demo (not a recorded recognizer output); ISMP Medication Safety Alert, 18 May 2017; ISMP List of Confused Drug Names, 2023",
  },
  {
    id: "thesis",
    title: "The product thesis",
    body: [
      "High recognizer confidence does not protect against two drug names that sound alike.",
      `So a drug name on the 2023 ISMP List of Confused Drug Names, ${ISMP_COUNT} pairs parsed from the published list, triggers a mandatory re-ask even at confidence 1.0.`,
      "The re-ask is contrastive: the agent names the drug it heard and every drug the list pairs with it, and only a spoken name answers it. A yes is not counted, and naming a partner corrects the value.",
      "This is not a threshold and not a heuristic. It is the order of the branches in the code: the pair check is read before the confidence check.",
    ],
    source: "branch order in src/gate/decide.ts; ismpPairCount() in src/lasa",
  },
  {
    id: "reasons",
    title: "Three reasons to re-ask, and they are not interchangeable",
    body: [
      "Confidence below the field's threshold.",
      "Failure of an independent validator.",
      "Membership in a pair of similar names, which fires regardless of confidence.",
      "The third reason is the product. Collapsing it into the first destroys the idea.",
    ],
  },
  {
    id: "invariant",
    title: "An invariant, not a policy",
    body: [
      "A value cannot reach the order around the gate. ConfirmedValue is a branded type, the brand symbol is private to its module, and there is exactly one type assertion to ConfirmedValue in the repository, inside gate/confirm().",
      'So "the LLM decided it was fine" cannot write a value: there is no code path.',
      "make gate-invariant fails if a second assertion appears, if this one disappears, or if a double type assertion through unknown shows up.",
    ],
  },
  {
    id: "demo",
    title: "The demo: two arms, one rule apart",
    body: [
      "The same synthesised case plays in both arms at /demo: the prescriber says hydromorphone, the recognizer returns morphine at confidence 1.0. Both arms run the shipped policy, so both read the drug name back.",
      'Pair rule off: the agent asks "Confirming the drug name: morphine. Correct?", the caller says yes, and morphine is ordered.',
      'Pair rule on: the agent asks "Which: morphine, M-O-R, or hydromorphone, H-Y-D? Answer with a name." A yes is refused as E_LASA_NAMED_ANSWER_REQUIRED. The caller has to say a name, says hydromorphone, and hydromorphone is ordered.',
      "The arms differ by one policy flag, lasaChecked, and by nothing else.",
    ],
    source:
      "the synthesised replay at /demo (not a recorded recognizer output); withoutPairRule in src/domain",
  },
  {
    id: "certain-and-wrong",
    title: "What was measured: the recognizer is sometimes certain and wrong",
    body: [
      "40 utterances, rare names chosen before the measurement.",
      "Said vinorelbine, heard venorelbine, confidence 0.981.",
      "Said glycopyrronium, heard glycopyrrhonium, confidence 0.955.",
      "A threshold of 0.95 would have accepted both. Entity Error Rate 27.5% [16.1%, 42.8%], Wilson interval.",
    ],
    source: "make eval-control, 40 utterances",
  },
  {
    id: "coverage",
    title: "What was measured: which mechanism pays for what",
    body: [
      "80 recorded utterances, 21 recognition errors.",
      "Absence from the catalogue: 21 of 21 errors caught, 0 of 59 correct values asked about.",
      "Pair rule: 0 of 21 errors caught, 21 of 59 correct values given a contrastive question: the correct values whose name is on the full ISMP list.",
      "Correct drug names asked about by the shipped gate: 59 of 59, because every drug name is read back once by policy; the threshold and the pair rule change which question is asked, not whether one is.",
    ],
    source: "make coverage-matrix, 80 recorded utterances",
  },
  {
    id: "cost",
    title: "The cost of the idea is published next to the benefit",
    body: [
      "The shipped gate reads every drug name back, so the question is not whether it asks but what a yes can write.",
      "Without the pair rule a reflex yes writes 20 of 20 pair mishearings; with it, 0. The same candidates, the same read-back, one flag apart.",
      "The price is a longer question on correct values whose name is on the list. It is published beside the catches, because publishing only the catches would make the metric one-sided.",
    ],
    source: "make ab-gate, 40 candidates: 20 correct, 20 misheard",
  },
  {
    id: "method",
    title: "What a figure has to survive before it is published",
    body: [
      "Recognizer runs are spaced 24 s apart, because a batch measures the new-session rate limiter instead of the recognizer. A pass at 1 s spacing reads as an EER of 52.5%, and its close codes give it away: all 21 failures closed with code 1008, all 19 successes with 1000. The report keeps that pass, marked not kept.",
      "The two checksums are not equally strong. The claim that NPI and DEA are equally checkable is false by 4.8% for DEA, over an exhaustive enumeration of 32,080 mutations: NPI catches every single-digit substitution, DEA misses one that changes a weight-2 digit by five. Arithmetic still replaces the read-back for both.",
    ],
    source:
      "the 1 s pass and its close codes in eval/REPORT.md (make live-runs); make audit-checksums, 32,080 mutations",
  },
  {
    id: "schedule-two",
    title: "A federally impossible order is not accepted as heard",
    body: [
      "Morphine sulfate with five refills is a real drug and a plausible number. Under 21 CFR 1306.12(a), refilling a Schedule II drug is prohibited.",
      "A deaSchedule field that sat in the data for 193 drugs, read by no rule, would let that order through with a green verdict. The gate reads it: it does not accept the refills as heard, the decision cites the regulation, the agent states the prohibition and offers to record none, and it does not ask for a spelling, because this is a prohibition, not a typo.",
      "This is worse than a mishearing: a misheard value looks uncertain, whereas an order like this one looks proven.",
    ],
    source:
      "npx tsx scripts/measure/schedule-census.ts over data/catalog.json; 21 CFR 1306.12(a)",
  },
  {
    id: "buyer",
    title: "Who the buyer is",
    body: [
      "Primary: pharmacy chains and prescription delivery services that take orders by voice. Compliance pays for this, not convenience.",
      "Secondary: telemedicine and insurer call centres, where voice prescription intake already exists and proof of intake does not.",
      "The purchaser is not the technology procurement department but whoever owns the regulatory risk.",
    ],
  },
  {
    id: "budget",
    title: "Why the budget exists",
    body: [
      "Read-back is not our idea and not an option. It is a procedure the regulator already requires: ICAO Annex 11 §3.7.3.1 for flight crews, Joint Commission NPSG since 2003 for verbal orders and critical results.",
      "We automate a step that regulation requires and practice routinely skips.",
      "A regulatory requirement is a mandatory budget, not a buyer to be convinced.",
    ],
    source: "ICAO Annex 11 §3.7.3.1; Joint Commission National Patient Safety Goals",
  },
  {
    id: "market",
    title: "Market",
    body: [
      "The unit of the market is a prescription intake workstation, not an abstract volume: every pharmacy and every delivery service that takes a prescription by voice has a finite number of them, and each one falls under the read-back requirement.",
      "SAM is those already deploying voice agents into intake.",
      "We publish no TAM estimate in money, because we did not measure it, and a project rule forbids a figure without a method and a set size. Everything we did measure sits in eval/REPORT.md with a command above every line.",
    ],
  },
  {
    id: "revenue",
    title: "Revenue model",
    body: [
      "Per workstation: a pharmacy intake line, a subscription.",
      "Per verified field: the volume component. It grows with use, and it is easy to set against the cost of a single dispensing error.",
      "A compliance report: the provenance of every field, with source words, timecodes and the validator's verdict, is already an audit artefact. That is what regulatory risk buys.",
    ],
  },
  {
    id: "difference",
    title: "What makes this different",
    body: [
      "Voice agents for medical intake are not a new idea, and keeping the model from writing a value directly is not new either.",
      "The difference is what overrides certainty. The usual gates fire on low confidence, a failed validator, or a value missing from a known set. A confidently pronounced wrong drug that exists in the catalogue passes all three.",
      "Here a published sound-alike list overrides confidence 1.0: a drug name in a published LASA pair is re-asked even when the recognizer is certain and the drug is valid, and the re-ask has to be answered with the name, not a yes.",
    ],
    source: "branch order in src/gate/decide.ts",
  },
  {
    id: "check-yourself",
    title: "What a judge can check for themselves in a minute",
    body: [
      "With no key, in one command: make honest reproduces every offline measurement it lists, each above the command that produced it and the size of its set. Not a single network call.",
      "In the browser: the attack console at /how-it-works. Lower the threshold to zero and get E_LASA_HIT, and see for yourself that the pair check is read before the threshold.",
      "Mechanically: make gate-mutation breaks one gate branch at a time and requires exactly the named test to fail. 12 of 12.",
    ],
    source: "make gate-mutation, as recorded in eval/REPORT.md",
  },
  {
    id: "limitations",
    title: "Honest limitations",
    body: [
      "Provenance is computed in the browser. The browser holds the recognizer socket, so word timings never pass through our server and are client-supplied data. At finalize the server checks each field against the agent's own transcript, fetched from the vendor with its own key, which the browser cannot write; that still does not prove a person spoke.",
      "Every corpus is synthesised speech, and the full calls on the production deployment used a synthesised caller. No human voice has been measured.",
      `The product rule is the full 2023 ISMP list, ${ISMP_COUNT} pairs parsed from the PDF with the page and row of each kept. The ${PAIR_COUNT} curated pairs, each checked by hand against its row, are the evaluation core and the demo.`,
      'What is not measured is marked "not measured" in the report, with the command that would measure it.',
    ],
    source: "LASA_PAIRS in src/lasa/pairs.ts",
  },
  {
    id: "next",
    title: "Next",
    body: [
      "Human voices: three team members record the voice set, and make eval-live sends it through the recognizer.",
      "Turn-to-turn latency on the live deployment, which needs the agent socket and the browser.",
      "Then: a second run of one unchanged set for reproducibility (make eval-repeat), and completed production runs of the two scripted calls that have none yet.",
    ],
  },
  {
    id: "conclusion",
    title: "Conclusion",
    body: [
      "We do not claim to recognize speech better. We claim that we know when we have no right to write down what we heard, and we prove it on our own data.",
      "12 of 12 gate mutations are killed by their own tests.",
      "Every ratchet check has a positive control: a test plants a violation and requires the check to fail, so a check that checks nothing cannot stay green.",
      "Every figure in the report carries its command and its set size. Numbers without a method we do not publish.",
    ],
    source: "make gate-mutation, as recorded in eval/REPORT.md",
  },
]
