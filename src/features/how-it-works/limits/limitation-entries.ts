import { ismpPairCount, LASA_PAIRS } from "@/lasa"
import type { Limitation, LimitationGroup } from "./limitation-types"
import { OPERATIONS_LIMITATIONS } from "./operations-entries"

const TRUST: readonly Limitation[] = [
  {
    id: "provenance",
    group: "trust",
    standing: "admitted",
    title: "Provenance is computed in the browser",
    status: "False against a hostile client, and stated as false",
    body: "The browser holds the recognizer socket directly, so word timings and per-word certainties never pass through our server; the client posts them to an unauthenticated route. Anyone with DevTools can post arbitrary words, and the gate will accept a value carrying that provenance: it checks that a value traces to words the session reported, not that those words were spoken. The route enforces bounds instead of a secret: a validated session id and caps on words per turn, turns per session and concurrent sessions. Relaying audio through our own host would fix it, at the cost of an always-on process this design deliberately does without.",
    link: { href: "/docs/threat-model", label: "What the vendor witness adds" },
  },
  {
    id: "bypassable",
    group: "trust",
    standing: "enforced",
    title: "Two guarantees rest on checks reading the tree correctly",
    status: "Enforced, each exploit kept as a test",
    body: "The gate-invariant check refuses a ConfirmedValue assertion in either TypeScript syntax outside the gate, any double assertion through unknown, and any type-checker suppression in product code. The secrets check reads the path app/api, not any directory merely named api, and fails when the key is absent from it. Each exploit is kept as a test, and every ratchet has a positive control, because a check that passes when its subject is missing manufactures confidence.",
  },
  {
    id: "hardening",
    group: "trust",
    standing: "admitted",
    title: "Known security weaknesses left open",
    status: "Ten open, each defensible for synthetic data only",
    body: "Ten known weaknesses of low severity are open.",
    pointsLabel: "The ten open weaknesses",
    points: [
      "A session id is a bearer capability: its holder can post turns, finalize and mint a reconnect token.",
      "Looking up an unknown session id costs up to three storage listings, anonymously.",
      "Finalize trusts an explicit origin label; a missing or unknown one still defaults to live, but the session's holder can set it on purpose.",
      "A deployment with no tool secret, or one too short, says so in the 401.",
      "The agent's own hint is quoted back when the gate answers it, as a spoken echo rather than an instruction.",
      "A store error's text reaches the client; a test pins that no token or URL is included.",
      "Bodies are parsed before bounds are checked; the platform limits their size.",
      "The metrics route is uncached, so every view re-reads every stored session.",
      "Blob objects are public, and the random id in the path is the only secret.",
      "Six dependency advisories remain: four fixed only by a major upgrade of next or @vercel/blob, not made, and two in Playwright, a test dependency counted through an optional peer of next.",
    ],
  },
]

const EVIDENCE: readonly Limitation[] = [
  {
    id: "self-correction",
    group: "evidence",
    standing: "measured",
    title: "A caller who corrects themselves is detected only through six markers",
    status: "Measured behaviour, pinned by tests; the gap is narrowed, not closed",
    body: "\u201cLisinopril, no wait, losartan\u201d refuses lisinopril as a value the caller took back (E_RETRACTED_VALUE, entering the validator branch). The markers are \u201cno wait\u201d, \u201csorry\u201d, \u201cI mean\u201d, \u201cactually\u201d, \u201cscratch that\u201d and \u201cnot X, Y\u201d, with the replacement within four words. A correction without a marker, one spread across two turns, or one using other words such as \u201crather\u201d or \u201cmake that\u201d is not detected; there the read-back is the mitigation.",
  },
  {
    id: "lasa",
    group: "evidence",
    standing: "measured",
    title: "The rule is the published list; the evaluation is the curated core",
    status: "Measured",
    body: `The pair rule applies the full 2023 ISMP List of Confused Drug Names, ${ismpPairCount()} pairs parsed from the published PDF with the page and row of each kept. Our measured catches and the demo rest on a hand-curated table of ${LASA_PAIRS.length} pairs, each checked by hand against its row; the rest of the list is applied, not separately evaluated. Matching strips salt forms, because the catalogue stores tramadol hydrochloride where the pair says tramadol. The rule knows only what the list publishes: lisinopril and bisoprolol are on neither tier and get the standing read-back only.`,
    link: { href: "/metrics#policy", label: "What the rule costs on correct names" },
  },
  {
    id: "synthesised",
    group: "evidence",
    standing: "measured",
    title: "The evaluation corpus is synthesised",
    status: "Measured against synthetic speech, and labelled everywhere",
    body: "We found no open English corpus of human speech reading drug names, so every entity error rate is measured against a desktop synthesiser through the live recognizer, and every figure derived from it inherits that boundary. Deliberately not measured:",
    points: [
      "Accuracy on human speech: no open corpus exists that we found.",
      "NPI existence against the live registry: our numbers are synthetic and would only add noise.",
      "Threshold optima: see the next entry.",
      "Keyterms that include drug names: it biases the recognizer toward the strings the rules check.",
      "Market size in money: a figure we cannot source would break the only rule this project is about.",
    ],
  },
  {
    id: "thresholds",
    group: "evidence",
    standing: "assumed",
    title: "Thresholds are chosen defaults, not measured optima",
    status: "Assumption, stated at the head of the report",
    body: "Each threshold was reasoned from the cost of an error in its field before any audio existed and was not tuned on any set, the held-out set included. Whether a slightly different threshold would do better is not measured.",
  },
  {
    id: "hypothesis",
    group: "evidence",
    standing: "admitted",
    title: "Our own pre-registered hypothesis failed",
    status: "Not supported, published anyway",
    body: "We predicted that rarer drug names would be measurably harder to recognise, and wrote the rule down before the audio existed. On the sealed held-out set the rare and middle strata are identical and every interval overlaps. The negative result stays published; what replicated is the overall error rate the product rests on.",
    link: { href: "/metrics#discipline", label: "The held-out figures" },
  },
  {
    id: "latency",
    group: "evidence",
    standing: "disclosed",
    title: "Word-to-gate latency is a browser measurement",
    status: "Labelled as client-side wherever it appears",
    body: "The session endpoint returns time to first audio and tool timings, but not word-level timings, so the time from a word to the gate's decision can only be measured in the browser. It is not measured yet.",
  },
]

export const LIMITATIONS: readonly Limitation[] = Object.freeze([
  ...TRUST,
  ...EVIDENCE,
  ...OPERATIONS_LIMITATIONS,
])

export function limitationsIn(group: LimitationGroup): readonly Limitation[] {
  return LIMITATIONS.filter((entry) => entry.group === group)
}
