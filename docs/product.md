# The case for Readback

> Why this problem, why pharmacy, and who would pay. In prescription intake a recognition
> error does not look like an error: "hydromorphone" heard as "morphine" is a real drug,
> plausible in context, and nothing in the recognizer's confidence has to signal it. Readback
> performs the read-back that the Joint Commission already requires for verbal orders, and for
> a name on the published ISMP list of confused drug names it asks a question only a spoken
> name can answer.

**Read this if** you want the argument for the product before its engineering, or you are
judging whether anyone would pay for it · **Related:** [for judges](for-judges.md) ·
[sources](sources.md) · [evidence](evidence.md) · [specification](specification.md) ·
[reference data](reference-data.md) · [limitations](limitations.md)

---

## What is it, in one sentence?

A voice agent for prescription intake that shows, for every field, the spoken words that
produced the value with their timecodes, the recognizer's confidence and the verdict of an
independent check, and that cannot write a value no validator proved and nobody confirmed
aloud.

## Why is it called Readback?

The name is the procedure, not a metaphor. Both requirements are quoted in full, with their
sources, in [sources](sources.md#what-requires-read-back).

| Where | Requirement | Status |
|---|---|---|
| Aviation | ICAO Annex 11 §3.7.3.1: *the flight crew shall read back to the air traffic controller safety-related parts of ATC clearances and instructions which are transmitted by voice* | **Cited** |
| Clinical practice | Joint Commission, a National Patient Safety Goal since 2003 (NPSG.02.01.01 in the 2009 wording): the receiver of a verbal or telephone order records it and reads it back | **Cited** |
| Where it sits now | ISMP placed it at PC.02.01.03 EP 20 in 2017; its location in the 2026 manual | **Not verified** |

The requirement exists; practice skips it. In ISMP's 2017 survey of 1,622 practitioners,
"nearly half (45%) of all respondents who reported receiving telephone or spoken orders told
us they do this less than 50% of the time", and "9% indicated they never carry out this
important verification process" ([sources](sources.md#how-large-is-the-error-class)).
Readback slots into an existing safety protocol rather than inventing a new one.

## What is the problem?

AssemblyAI's own example: *"A patient states an allergy to Lisinopril. The transcript reads
Bisoprolol."* Both drugs exist, both are plausible, and nothing signals a fault. ISMP records
the same failure between people: *"A nurse misheard a verbal physician's order for
HYDROmorphone as morphine."* And, in AssemblyAI's words, *"A conversation isn't one
transcription. It's a chain of them."*

The vendor's own figures set the scale. Each is quoted from
[sources](sources.md#what-does-the-vendor-publish-about-recognition-errors) and none is
re-measured here:

| Claim | Vendor's figure | Source |
|---|---|---|
| Entity error rate, Universal-3.5 Pro Realtime | "Entity error rate 15.31%", at a pooled word error rate of 6.99% | [Universal-3.5 Pro Realtime](https://www.assemblyai.com/blog/universal-3-5-pro-realtime), 23 June 2026 |
| Entity errors on names | "Names 16.92%", the benchmark's names category, not drug names specifically | the same page |
| Five turns, no confirmation | "At 84.69% per turn it comes through clean 43.6% of the time." | [The Voice Agent Accuracy Problem Nobody Benchmarks](https://www.assemblyai.com/blog/voice-agent-accuracy-problem-benchmarks), 8 September 2026 |
| Five turns, every entity read back | 79.1%, if "the caller catches errors 70% of the time" (about 95.4% per turn) | the same article |

The last row is a projection, not a measurement, and its weak point is the caller. A caller
who hears "morphine, correct?" and says "yes" out of habit is how the 70% assumption fails,
and it is the case this product is built around.

How large the error class is, from outside the vendor: WHO estimates that LASA errors are
"responsible for 6.2–14.7% of all medication errors", and ISMP found that in community
pharmacies "telephone (96%) and voicemail (79%) were the primary modes of communicating
verbal orders" ([sources](sources.md#how-large-is-the-error-class)). Evidence that cuts the
other way, a hospital where verbal orders erred less often than handwritten ones, is in
[sources](sources.md#what-evidence-cuts-against-the-product).

Lisinopril and bisoprolol are on no published list of confused drug names, so the pair rule
does not guard them; only the ordinary read-back does. The demo uses a pair the ISMP list
carries: hydromorphone and morphine.

## Why pharmacy?

| Property of the domain | What the product does with it | Details |
|---|---|---|
| A regulator publishes the confusable names: the [ISMP List of Confused Drug Names](https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf), updated through February 2023 | Parsed into `data/lasa-pairs.json`; every published pair drives the re-ask rule | [reference data](reference-data.md#how-is-the-lasa-table-built) |
| A public drug catalogue needs no key: the [FDA NDC Directory](https://www.accessdata.fda.gov/cder/ndctext.zip) | Built offline into `data/catalog.json`; drug, strength, form and route must be one real product | [reference data](reference-data.md#what-does-the-catalogue-need-before-it-is-usable) |
| Two identifiers carry a checksum: DEA (mod-10) and NPI (Luhn with the `80840` prefix) | A mistyped or misheard digit is rejected by arithmetic, whatever the recognizer heard | [reference data](reference-data.md#what-does-the-arithmetic-prove) |
| A published list of dangerous abbreviations: [ISMP Error-Prone Abbreviations](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf), 2024-04 | The `sig_abbrev` validator refuses `qd`, `U`, `MSO4` and the rest | [reference data](reference-data.md#which-sources-does-the-product-read) |

Because ISMP assembled the pairs, the answer to "why is your test set representative?" does
not depend on the team: each pair is on the list because it has caused errors.

The weakness is stated first rather than waited for: **a drug name has no checksum.** DEA and
NPI are provable by arithmetic; a drug name, strength, form and route are checked by existence
in the catalogue and by the combination being one real product.

The recognizer socket sends `domain=medical-v1` (Medical Mode). Whether it helps on these
names has not been measured: no run with the mode off exists.

**No personal data is needed.** Drug names, strengths, forms and sig codes are not personal
data; DEA and NPI numbers are synthesised from their checksums, and patient names are
fictitious. The product is a technology demonstration, not a medical device.

## What happens in a call?

A prescriber or a nurse phones a pharmacy and dictates an order. The agent carries the
conversation, and every value it hears goes through the gate before it can enter the order:

```
Drug:          hydromorphone
Strength:      2 mg/mL
Form:          injection, solution
Route:         intravenous
Quantity:      30
Sig:           1 mg intravenously every 4 hours as needed
Prescriber:    NPI 1245319599, DEA AB1234563
Patient:       Maria Lopez (fictitious)
Refills:       0 (a Schedule II product may not be refilled)
```

### What does each field carry?

| Element | Where it comes from | What it is for |
|---|---|---|
| Value | the agent's proposal, normalized by the server | the data itself |
| Source words and timecodes | `words[]` of the recognizer's `Turn`, `start` and `end` in milliseconds | clicking the field highlights exactly those words |
| Confidence | the minimum over the source words | the threshold for a re-ask |
| Validator verdict | NPI Luhn, DEA mod-10, catalogue, combination, abbreviation list, range | an objective "does not add up", with the rule cited |
| Confirmation | the caller's answer to the read-back, or the validator for an arithmetic-proved value | what was confirmed, and by which words |
| LASA risk | membership in a pair on the ISMP list | forces the contrastive question below |

### Three reasons the agent must re-ask

This is code, not a prompt. The function that writes a field accepts only a `ConfirmedValue`,
and only the gate can build one.

1. **Low confidence.** The minimum confidence over the source words is under the field's
   threshold.
2. **Validator failure.** A checksum does not add up, the drug is not in the catalogue, the
   drug, strength, form and route are not one product, or the value is not supported by the
   words it was quoted from.
3. **A published confusable name.** The recognized name is on the ISMP list. The re-ask is
   then mandatory at any confidence, and it is contrastive: the agent names the heard drug and
   every drug the list pairs with it, and only a spoken name answers. A "yes" confirms nothing;
   naming a partner writes the partner.

For "morphine" the agent says, word for word: *"morphine and hydromorphone are on a published
confused-drug-names list. Which: morphine, M-O-R, or hydromorphone, H-Y-D? Answer with a
name."* The list pairs "hydromorphone" with five drugs, so that question names six.

The third reason is the heart of the product. The model can be certain of "morphine" because
it heard it clearly while the human said "hydromorphone"; confidence does not protect against
homophony, a regulator's list does. [Specification](specification.md) section 3 gives the
branch order.

A value its validator proves, such as an NPI whose checksum passes above its threshold, is
written at once without a read-back: where arithmetic exists, voice is not spent. Everything
else is written only after the caller's confirmation.

The recognizer's biasing list carries no drug name at all, so the recognizer is never nudged
toward the names the pair rule checks; `make keyterms-purity` fails the build if one enters
([specification](specification.md) section 6).

## Why two sockets, opened by the browser?

The gate needs `words[]` with timecodes and confidence, so Streaming STT is required; the
conversation, turn detection and barge-in come from the Voice Agent API. The browser opens
both on short-lived tokens the server mints, so there is no audio proxy and no always-on host.
The consequence is that provenance is client-supplied data; [security](security.md) and
[limitations](limitations.md) say what that does and does not allow, and
[architecture](architecture.md) draws the system.

## What has been shown, and what has not?

Every figure, with its command and set size, is in [evidence](evidence.md) and
[eval/REPORT.md](../eval/REPORT.md). The four that bear on the case:

| Question | Result | Status |
|---|---|---|
| What does a reflex "yes" write, with the pair rule on and off? | Off: 20 of 20 constructed pair mishearings are ordered. On: 0 of 20, at a cost of 4 contrastive questions on 20 correct values (`npx tsx scripts/measure/ab-gate.ts`) | **Measured**, offline, constructed mishearings |
| Does the recognizer confidently turn a listed name into its partner? | Not observed: 0 of 186 scored degraded utterances, synthesised voices ([evidence](evidence.md#can-the-recognizer-be-confident-and-wrong)) | **Measured** |
| Does a whole call reach a committed order? | On production, `clean-order` and `lasa-named` committed; `yeah-no` and `barge-in` completed; `npi-groups` and `commit-hold` have no completed run (`eval/live/runs.json`) | **Observed**, synthesised caller |
| Does any of it hold with a human voice? | No human recording exists; the script is the [voice set](../eval/live/voice-set.md) | **Not measured** |

The second row is the product's weakest point, stated at full strength: the confident
substitution the pair rule exists for has not been seen in this corpus. The rule rests on the
published list, not on this data ([limitations](limitations.md#the-evaluation-corpus-is-synthesised)).

## What does a judge see?

A replay that needs no key and no microphone: the same session with "hydromorphone" heard as
"morphine" at confidence 1.0, a staged error, run through the shipped gate twice. With the
pair rule on, a "yes" writes nothing and the name the caller says is ordered; with only the
pair rule switched off, a plain read-back, a reflex "yes", and the wrong drug ordered. The two
arms differ by `lasaChecked` alone. [For judges](for-judges.md) is the two-minute route,
including a live call.

## Who pays for this?

**Why the step is already paid for.** Where the Joint Commission requirement applies, every
verbal order already costs a read-back in staff time; the product performs that step and
leaves a record of it. The requirement binds the organisations the Joint Commission accredits.
For a community pharmacy we have not sourced an equivalent requirement; there the argument is
ISMP's finding that the telephone is the main channel for verbal orders and read-back is often
skipped.

**What an error costs.** The Institute of Medicine restates one study: "each preventable ADE
that took place in a hospital added about $8,750 (in 2006 dollars) to the cost of the hospital
stay" ([sources](sources.md#what-does-a-medication-error-cost)). That is a hospital adverse
drug event, not a dispensing error, and it is not our measurement.

**What a call costs to run.** The two sockets bill $5.10 an hour at the vendor's list rates
([cost and budget](cost-and-budget.md)). The two production calls that committed an order
used at most 269 s and 289 s of socket time, $0.38 and $0.41 (`eval/live/runs.json`;
**Observed**, two calls, synthesised caller, harness wall clock as an upper bound). The pair
rule's price in call time is questions: on the recorded control corpus the full list puts 21
of 59 correct drug names to a contrastive question, on the held-out corpus 6 of 44
(`npx tsx scripts/measure/ismp-coverage.ts`).

**Who would buy, and what.** **Assumption, not result**: no buyer has been interviewed.

| Buyer | Why |
|---|---|
| Hospital and health-system pharmacies | bound by the read-back requirement; own the regulatory risk |
| Pharmacy chains and prescription delivery services taking orders by phone | telephone is the main channel for verbal orders; read-back is often skipped |
| Telehealth and insurer call centres | voice intake exists; proof of intake does not |

What would be sold: an intake line; a verified field, which scales with use; and the receipt,
provenance for every field with source words, millisecond timecodes and a validator's verdict,
which is an audit record made during the call rather than a report written after it.

**The number we do not publish.** There is no market size in money, because none was
measured, and no count of US prescriptions phoned in, because no credible source was found
([sources](sources.md#what-could-not-be-sourced)). A reviewer scoring business value will find
less here than in a proposal willing to estimate; that is an honest weakness.

## What is new here, and what is not?

Putting deterministic code between a model and a record is not new. What is different:

1. **A regulator-published sound-alike list overrides confidence 1.0 for a value that is
   valid in the catalogue.** A gate that fires only on low confidence, a failed validator or a
   value missing from a known set lets a confident, valid, wrong drug name through.
2. **A "yes" cannot confirm a listed name.** The read-back is contrastive, so the reflex
   agreement that defeats the vendor's 70% assumption writes nothing.
3. **The test pairs are the regulator's, not the team's.** The A/B over the gate uses curated
   pairs, each a row of the ISMP list, and the held-out set was sealed by digest before it was
   read (`make heldout-seal`), so a figure from it is an estimate of generalisation, not a
   regression suite.

## What could go wrong?

| Risk | Likelihood | Response |
|---|---|---|
| The recognizer rarely produces a confident partner substitution, so the pair rule catches no natural mishearing | already the case in our synthesised corpus | the claim rests on the published list and on constructed mishearings, and says so |
| A listed name makes the question long, and callers tire of it | medium | the cost is published beside the catch; see the figures above |
| Medical Mode helps less than expected on these names | unknown | not measured; an A/B on the same audio is the test |
| The live path is unavailable when a judge arrives | medium | the replay needs no key, no microphone and no socket, and `/api/health` reports whether the live path is configured |
| The product is read as medical advice | low | an explicit disclaimer: a technology demonstration, not a medical device, synthetic data only |
| The NDC format changes | certain, by 2033 | the [final rule](https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements) moves every NDC to 12 digits; the product proves drugs by name and combination, not by NDC code |

## The pitch, in one paragraph

In prescription intake a recognition error does not look like an error: "hydromorphone" heard
as "morphine" names a real drug, and nothing signals a fault. By AssemblyAI's figures, at
84.69% entity capture per turn a five-turn conversation comes through clean 43.6% of the time;
AssemblyAI projects 79.1% if every entity is read back and the caller catches 70% of the
errors, a model rather than a measurement. Readback makes that confirmation an architectural
constraint: a value does not enter the order if its checksum fails, if its confidence is under
the threshold, or if the name is on the published ISMP list of confused drug names, and in
that last case only a spoken name, never a "yes", answers the question. Every field shows its
source words with timecodes and the recognizer's confidence, and every published figure
carries its command, with a dash where nothing was measured.

---

<sub>[Documentation index](README.md) · [Project README](../README.md)</sub>
