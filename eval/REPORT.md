# Evaluation report

> Every measured figure of Readback, each beside the command that produced it and the size of
> the set it came from. The recognizer is wrong on rare drug names about a quarter of the time,
> and some of those errors arrive with confidence above the field threshold; the shipped gate
> stops every recorded error before a plain read-back and asks about every correct drug name
> once. All speech measured here is synthesised: no figure in this file comes from a human
> voice.

**Read this if** you want a number and the command that reproduces it, or the set it rests on ·
**Related:** [evidence](../docs/evidence.md) · [limitations](../docs/limitations.md) ·
[verification](../docs/verification.md) · [specification](../docs/specification.md) ·
[cost and budget](../docs/cost-and-budget.md)

---

## How to read a figure in this report

| Rule | What it means here |
|---|---|
| Command and set size | Every figure names the command that prints it and its n. A figure without both is not published. |
| Offline reproduction | `make honest` re-runs every offline command in this file from committed artefacts, with no key and no network call. `tests/scripts/honest-report-agreement.test.ts` fails when a figure it prints is missing from this file. |
| Paid recording | A set is recorded once by a paid command (`make eval`, `make eval-control`, ...) and then read offline. The recording command is named beside the reading command. |
| Status | **Measured** (a command over recorded data), **Enforced** (a check or test fails otherwise), **Observed** (seen in a live run, not a rate), **Cited** (someone else's measurement), **Not measured**. |
| Aggregation | Confidence over a span is the minimum over its words, never the mean: a mean hides the one failed word. |
| Intervals | Rates carry a 95% Wilson interval where the command prints one. |
| Spacing | Within one sweep, recognizer sessions open 24 s apart: the free tier allows 5 new sessions per minute. |
| Speech | Every corpus is Windows desktop TTS (Microsoft David and Zira). It measures relative difficulty, not clinical accuracy. |

### The sets

| Set | N | What it is | Recorded by |
|---|---|---|---|
| `eval/dev` | 40 | 40 common drug names in 20 look-alike pairs, read in a carrier phrase | `make eval` |
| `eval/control` | 40 | 40 generic names drawn with a fixed seed from the catalogue, excluding the pair table, 6 to 16 letters | `make eval-control` |
| `eval/native16` | 40 | the `eval/control` names synthesised directly at 16 kHz, with no resampling | `make eval-native16` |
| `eval/heldout` | 60 | 60 names in three rarity strata, pre-registered and sealed | `make eval-heldout` |
| `eval/units` | 12 | four amounts by three unit classes in one carrier phrase | `make eval-units` |
| `eval/stress` | 188 | the 47 recordings of `eval/dev` and `eval/control` whose name is on the ISMP list, in four degraded conditions | `npx tsx scripts/measure/measure-eer.ts --set eval/stress` |

The `eval/dev` pairs are not the curated tier described under *How far the published list
reaches*: the two overlap, and `eval/dev` includes lisinopril and bisoprolol, which are not a pair
on the ISMP list. Its entity error rate does not depend on which list a name is cited from.

---

## What the recognizer gets wrong

### Entity error rate

Status: **Measured**, live recognizer `universal-3-5-pro`, reprinted offline by
`npx tsx scripts/eer/report.ts eval/<set>`.

| Set | N | EER, 95% Wilson | Confidence P50 | Close codes | Command |
|---|---|---|---|---|---|
| development, LASA terms | **40** | **0.0%** [0.0%, 8.8%] | **0.990** | 1000 only | `make eval` |
| control, safe drugs | **40** | **27.5%** [16.1%, 42.8%] | **0.975** | 1000 only | `make eval-control` |
| control, synthesised natively at 16 kHz | **40** | **25.0%** [14.2%, 40.2%] | **0.976** | 1000 only | `make eval-native16` |
| held-out, three strata | **60** | **26.7%** [17.1%, 39.0%] | **0.967** | 1000 only | `make eval-heldout` |

**0.0% describes the corpus, not the recognizer.** The development names are common drugs the
recognizer knows; the control set draws names like `zidesamtinib` and `inavolisib`, which it
does not. A benchmark built only from famous drug names measures familiarity, not safety.

The development run still shows the threshold's own ask rate on audio where nothing went wrong:
**4 of 40** names were heard correctly below the 0.95 `drugName` threshold (`metformin` 0.928,
`klonopin` 0.936, `morphine` 0.939, `cefazolin` 0.949). `eval/dev/result-plain.json` holds the
per-utterance scores, confidences, close codes and socket times, but not word-level timings, so
this set cannot be re-derived per word.

### Confident and wrong

On `eval/control`, **two of the eleven errors carried a confidence above the 0.95 threshold for
`drugName`:**

| Spoken | Heard | Confidence | A threshold alone would |
|---|---|---|---|
| `vinorelbine` | `venorelbine` | **0.981** | **accept it** |
| `glycopyrronium` | `glycopyrrhonium` | **0.955** | **accept it** |

These are recorded confidences. On this corpus a threshold alone writes **2 wrong drug names of
40** into the order while re-asking **8 correct ones**. Neither pair is on the ISMP list, so the
pair rule does not catch them either; the catalogue check does (see the coverage matrix below).

### The resampler is not the cause

Audio is synthesised at 22050 Hz and resampled to 16000 Hz by linear interpolation with no
anti-aliasing filter. `eval/native16` removes that step. Status: **Measured**;
`tests/eval/resampler-ablation.test.ts` pins the comparison.

| Arm | EER | `vinorelbine` | `glycopyrronium` |
|---|---|---|---|
| resampled 22050 to 16000 | 27.5% | wrong at 0.981 | wrong at 0.955 |
| synthesised natively at 16000 | 25.0% | **wrong at 0.984** | **wrong at 0.963** |

Ten of the eleven errors occur in both arms, one (`apixaban`) only in the resampled arm, none
only at native rate. Both above-threshold mishearings reproduce with no resampling in the path.
The two sets are an ablation, not a reproducibility pair.

### Confidence calibration

`npx tsx scripts/measure/analyse-calibration.ts`, over 120 recorded utterances of `eval/control`,
`eval/dev` and `eval/native16`. Status: **Measured**.

| Reported confidence | N | Heard correctly | Observed accuracy, 95% Wilson |
|---|---|---|---|
| 0.99 and above | 44 | 44 | 100.0% [92.0%, 100.0%] |
| 0.95 to 0.99 | 39 | 35 | **89.7% [76.4%, 95.9%]** |
| 0.90 to 0.95 | 13 | 11 | 84.6% [57.8%, 95.7%] |
| 0.80 to 0.90 | 6 | 3 | 50.0% [18.8%, 81.2%] |
| below 0.80 | 18 | 6 | 33.3% [16.3%, 56.3%] |

The curve is monotonic: a higher confidence does mean a better chance of being right, and the
product does not claim otherwise. The claim is narrower. In the band where the `drugName`
threshold accepts, observed accuracy is 89.7%, not 100%: of 83 utterances at or above 0.95,
**4 were misheard** (`vinorelbine` at 0.981 and 0.984, `glycopyrronium` at 0.955 and 0.963). A
threshold anywhere at or below 0.98 accepts all four.

### Error shapes

| Figure | Value | n | Command | Status |
|---|---|---|---|---|
| errors whose true name the consonant skeleton recovers | **10 of 21** | 80 utterances of `eval/control` and `eval/native16` | `make coverage-matrix` | Measured |
| correct values the skeleton lookup runs on | **0** | 59 correct values: none is absent from the catalogue | `make coverage-matrix` | Measured |
| distinct skeletons indexed | **5707** | 3730 catalogue products | `make audit-catalog` | Measured |
| strength not recovered exactly, 95% Wilson | **0.0% [0.0%, 24.2%]** | 12 | `eval/units/result-plain.json`, recorded by `make eval-units` | Measured |
| wrong unit class, the thousandfold error | **0 of 12** | 12 | same | Measured |

The consonant skeleton is the word with vowels, `y` and `h` removed and `ph` folded to `f`.
Both above-threshold errors are unstressed-vowel substitutions inside a correct consonant frame
(`vnrlbn`, `glcprrnm`). The skeleton lookup runs only when the heard value is absent from the
catalogue and never offers the word just said, so it adds no questions on correct values. It
enriches the existing `E_VALIDATOR_CATALOG` refusal rather than adding a gate branch:

```
no prescription product in the built catalogue matches "venorelbine";
the same consonant skeleton "vnrlbn" belongs to vinorelbine,
which a vowel substitution would explain
```

It cannot help when the misheard value is itself a real drug; that case is what the ISMP pair
rule covers. The unit corpus found no milligram-microgram confusion, and at n = 12 it cannot
rule out a rate as high as 24%. The catalogue lookup folds `mcg` and `ug` into one unit
(`src/catalog/query.ts`), because the catalogue stores `ug` and speech normalisation emits `mcg`.

### An independent observation of the same effect

Status: **Cited**, not reproduced. Another submission in the same hackathon published a live
`universal-3-5-pro` run in which a two-word business name came back as a three-word homophone.
The word-level confidences on the wrong words were **0.408 and 0.385**, while the **turn-level
confidence was 0.882**. A turn can read as confident while the words that matter are not, which
is why the gate takes the minimum over the source words. That error was caught by low word
confidence, so it supports the first reason to re-ask, not the pair rule; the case the pair
rule exists for rests on the four above-threshold errors above. The link is withheld because
this report does not name other teams.

---

## What the gate asks and what it catches

### Every threshold is a chosen default

Thresholds live in `src/domain/policy.ts`; the per-field table, with validators and read-back
policy, is in [the specification, section 2](../docs/specification.md#2-the-field-policy-and-why-the-numbers-are-what-they-are).
They were reasoned from the cost of an error per field before any audio existed and **were not
tuned on any set**; whether another value would do better is not measured. The one this report
leans on is `drug_name`: 0.95, catalogue validator, always read back.

### Which mechanism pays for which ask, over recorded confidences

`npx tsx scripts/measure/coverage-matrix.ts` (`make coverage-matrix`), over the 80 utterances of
`eval/control` and `eval/native16`: 21 recognizer errors and 59 correct values, every
confidence recorded from AssemblyAI. Each utterance is assigned to the **first** branch the
shipped gate takes: catalogue, then the pair rule, then the confidence threshold, then the
standing read-back. Status: **Measured**; seven tests in `tests/eval/coverage-matrix.test.ts`
guard it.

| Mechanism | Errors caught | Asks on correct values |
|---|---|---|
| catalogue absence | 21/21 | 0/59 |
| another validator | 0/21 | 0/59 |
| pair rule, contrastive read-back | 0/21 | 21/59 |
| confidence below threshold | 0/21 | 13/59 |
| standing read-back by regulation | 0/21 | 25/59 |
| accepted without a question | 0/21 | 0/59 |

| Figure | Value |
|---|---|
| errors caught before any plain read-back, Wilson, n=21 | **100.0% [84.5%, 100.0%]** |
| correct drug names the shipped gate asks about | **59/59**: 25 by the standing read-back, 13 by the threshold, 21 by the pair rule |
| correct values given a contrastive question, the pair rule's cost | **21 of 59, 35.6% [24.6%, 48.3%]** |
| errors at or above the 0.95 threshold, which a threshold alone accepts | **4 of 21** |

Every drug name is read back once by regulation, so the pair rule and the threshold change
which question is asked, not whether one is. The threshold, for a drug name, changes the
wording of that question. With the pair rule switched off it takes 16 of the 59, and the
standing read-back the other 43; the errors are unchanged, because catalogue absence answers
first for all 21. The pair rule turns the question contrastive for 21 correct values because
the rare names of the control corpus include many on the full ISMP list (`sirolimus`,
`tacrolimus`, `duloxetine`, `aripiprazole` and others).

**Why the pair-rule row catches no error.** None of the 21 recorded errors landed on a published
pair: each misheard value is absent from the catalogue, so the catalogue answers first. The row
is zero because of the corpus, not because the rule is inert; `make ab-gate` below exercises it
on 20 pair mishearings.

### What a read-back costs in time

Printed by the same command. Status: **Measured** on text length, with an assumed speaking rate.

| Figure | Value |
|---|---|
| fields read back by regulation | 5 of 11: `drug_name`, `strength`, `quantity`, `sig`, `patient_name` |
| plain drug-name read-back | 6.0 words on average over the 59 correct values, about 2.5 s |
| contrastive read-back naming every published partner | 28.7 words on average over the 21 values the list asks about, about 11.8 s, or 9.4 s more |
| speaking rate used | 2.43 words per second, the desktop synthesiser as the recognizer timed it over `eval/control` |

**The agent's own voice has not been timed.** Each spelled letter of a cue counts as a word, so
the contrastive figure overstates the letters.

### The pair rule against the same policy without it

`npx tsx scripts/measure/ab-gate.ts` (`make ab-gate`), 40 candidates on `drugName`, seed
20260916: twenty carry a mishearing inside one of the 20 curated pairs, twenty carry the value
actually said, with assigned confidences spanning the 0.95 threshold. Three arms through the
same `decide()`. Status: **Measured** over assigned confidences.

| Arm | Wrong values written unasked | Wrong values a reflex yes writes | Mishearings put to a contrastive question | Correct values asked | Contrastive asks on correct values | Threshold asks on correct values | Standing read-backs on correct values |
|---|---|---|---|---|---|---|---|
| shipped: pair rule, standing read-back, threshold | 0 | 0/20 | 20/20 | 20/20 | 4/20 | 6/20 | 10/20 |
| without the pair rule: standing read-back, threshold | 0 | 20/20 | 0/20 | 20/20 | 0/20 | 8/20 | 12/20 |
| threshold only: no pair rule, no standing read-back | 12 | 20/20 | 0/20 | 8/20 | 0/20 | 8/20 | 0/20 |

The first two rows differ by the pair rule alone. Both read every drug name back, so neither
writes a wrong value unasked; what differs is what a reflex "yes" would write: all 20 pair
mishearings without the rule, none with it. The cost is 4 contrastive questions on 20 correct
values that are themselves names on the full ISMP list. The third row is a confidence
threshold alone, which writes 12 of the 20 mishearings without asking.

These confidences are assigned, not recorded, so the table describes the decision function and
not the recognizer. "A reflex yes writes it" is a property of the question asked; how often a
real caller answers a plain read-back by reflex is not measured.

### Rules the gate enforces that have no measured rate

Status: **Enforced** by the named tests. None of them has been measured on live callers.

| Rule | Reason codes | Where it lives | Tests |
|---|---|---|---|
| Contrastive read-back | `E_READBACK_NOT_CONTRASTIVE` | `src/sessions/confirmation-evidence.ts`, `src/confirmation/named-answer.ts` | `tests/sessions/contrastive-read-back.test.ts`, `tests/api/contrastive-read-back.test.ts` |
| A named answer only | `E_LASA_NAMED_ANSWER_REQUIRED`, `C_CALLER_NAMED_VALUE`, `E_CALLER_NAMED_LASA_PARTNER` | same | same, plus `tests/sessions/demo-run.test.ts` |
| Self-correction | `E_RETRACTED_VALUE` | `src/confirmation/self-correction.ts` | `tests/confirmation/self-correction.test.ts`, `tests/api/self-correction.test.ts` |
| Schedule II refills | 21 CFR 1306.12(a) | `src/validators/schedule.ts` | `tests/validators/schedule.test.ts` |
| Every gate branch has a test that kills it | named per branch | `scripts/checks/gate-mutation.sh` | `make gate-mutation` itself |

- **Contrastive read-back.** For a listed value the read-back names every drug of the pair with
  the letters that tell them apart; a read-back naming a single drug confirms nothing.
- **A named answer only.** A plain "yes" to a contrastive question writes nothing; saying a name
  confirms it; saying the partner corrects the value to the partner. `demo-run.test.ts` pins
  that the two demo arms differ in the pair rule alone.
- **Self-correction.** A value followed by a correction marker ("no wait", "sorry", "I mean",
  "actually", "scratch that", "not X, Y") and, within four words, another value of the same
  kind fails `spoken_support`, inside the existing validator-failure branch. No kind test
  exists for patient names, sig, form and route, so a retraction there is not detected.
- **Schedule II refills.** A Schedule II drug with any refills is refused, and the agent offers
  "none" rather than asking for a spell-out. Only this federal rule is implemented; state
  day-supply caps are not.
- **Gate mutation.** `make gate-mutation`, a `make verify` step, breaks each of the 12 branches
  declared in `scripts/checks/gate-mutations.txt` and requires the matching test to fail by
  name.

The Schedule II rule reads `deaSchedule` from the catalogue.
`npx tsx scripts/measure/schedule-census.ts` counts 193 drugs, CII 74, CIII 40, CIV 64, CV 15,
out of 3730. Status: **Measured**.

| Input | Gate result |
|---|---|
| `morphine sulfate` (CII), 5 refills | **refused**, cites 21 CFR 1306.12(a) |
| `morphine sulfate` (CII), 0 refills | accepted |
| `alprazolam` (CIV), 5 refills | accepted; the prohibition does not cover CIV |
| `lisinopril` (no schedule), 5 refills | accepted; range check only |

---

## How far the published list reaches

### The full ISMP list is the product rule

`npx tsx scripts/measure/ismp-coverage.ts`, over `data/lasa-pairs.json`, which
`npx tsx scripts/build/lasa.ts` builds from the ISMP List of Confused Drug Names, updated through
February 2023 (source URL and PDF SHA-256 recorded in the file, with the page and row of every
pair). Status: **Measured**.

| Figure | Value |
|---|---|
| rows parsed | **1056**, row groups left unresolved **0** |
| distinct pairs in the full list | **514** |
| distinct names the product rule checks | **754** |
| pairs with both names in the catalogue | **204 of 514 (39.7%)** |
| pairs with one name in the catalogue | 153 of 514 (29.8%) |
| listed names found in the catalogue only as a brand, mapped to a generic | 124 |
| catalogue drugs carrying a name on the list | **502 of 3730 (13.5%)** |
| correct values of the control corpus put to a contrastive question | **21 of 59, 35.6% [24.6%, 48.3%]** |
| correct values of the held-out corpus put to a contrastive question | **6 of 44, 13.6% [6.4%, 26.7%]** |

The control corpus was drawn to exclude the curated pairs, not the full list, so its rare names
land on the list often. The held-out corpus, stratified by how established a drug is, is the
better guide to a routine order. A parse yielding fewer than 40 pairs refuses to overwrite the
committed snapshot, and without the PDF `make data` keeps the snapshot.

**The rule fires on every published pair.** The consonant-skeleton distance between the two
names of each pair is measured, never used as a filter:

| Consonant-skeleton edit distance | Pairs |
|---|---|
| 0 | 14 (2.7%) |
| 1 | 97 (18.9%) |
| 2 | 174 (33.9%) |
| 3 | 142 (27.6%) |
| 4 to 5 | 58 (11.3%) |
| 6 to 9 | 19 (3.7%) |
| 10 or more | 10 (1.9%) |

Median distance: 2.

### The curated tier

`npx tsx scripts/build/stitch-lasa.ts`. The curated pairs are the evaluation core and the demo;
`tests/lasa/pairs-sourced.test.ts` requires each to be a row of the parsed list, with page and
row. The demonstration pair is HYDROmorphone - morphine. Status: **Measured**.

| Figure | Value |
|---|---|
| pairs in the curated table | **20** |
| pairs with both terms found in the catalogue | **20 of 20 (100.0%)** |
| term match rate, exact name only | **31 (77.5%)** of 40 |
| term match rate, salt-stripped lookup including proprietary names | **40 (100.0%)** of 40 |

Salt stripping plus proprietary matching is worth 22.5 percentage points: the catalogue stores
`tramadol hydrochloride` where the pair says `tramadol`, and `oxycontin` appears only as a
proprietary name. The catalogue, `data/catalog.json`, holds **3730** distinct prescription drug
names and records its build date, source URL and SHA-256.

### Real drugs that share a skeleton

`npx tsx scripts/measure/audit-catalog.ts` (`make audit-catalog`) points the gate's skeleton
detector at the shipped catalogue of 3730 products. Status: **Measured**; eight tests in
`tests/catalog/self-audit.test.ts` pin the classification.

| What the collision is | Count |
|---|---|
| one name punctuated two ways | 71 |
| a spelling error in the FDA registry itself | 28 |
| **two genuinely different drugs** | **32** |
| total skeletons shared by more than one name | 131 |

| Skeleton | Names sharing it |
|---|---|
| `stll` | `sotalol`, `istalol` |
| `rfdn` | `rifadin`, `orfadin` |
| `sprn` | `suprane`, `syprine` |
| `trcnzl` | `itraconazole`, `terconazole` |
| `mglstt` | `migalastat`, `miglustat` |
| `trsmd` | `torsemide`, `etrasimod` |

The 32 bound the case no mechanism covers: a misheard value that is itself a real drug not on
the list. Of the 32, only migalastat and miglustat is a row of the full ISMP list (page 8, row
24), so the product rule covers it. The rest are not added to the pair table: the table holds
published pairs only, and a pair derived by our own detector is a hypothesis. The 28 registry
misspellings are why the catalogue check refuses an unknown name instead of correcting it to
the nearest known one (`lamotirigine` is in the FDA file).

---

## What the checksums catch

`npx tsx scripts/measure/audit-checksums.ts 200` (`make audit-checksums`): every single-digit
substitution and every adjacent transposition of 200 valid identifiers of each kind,
32 080 mutations, exact coverage rather than an estimate. Status: **Measured**; four tests in
`tests/validators/checksum-coverage.test.ts` pin both rows.

| Identifier | Single-digit substitutions | Adjacent transpositions |
|---|---|---|
| NPI, Luhn over 80840 plus nine digits | **100.0%** (18000/18000) | 97.9% (822/840) |
| DEA, mod-10 over seven digits | **95.2%** (12000/12600) | **100.0%** (640/640) |

The two checks are not equivalent. DEA weights alternating digits by 1 and 2 and sums mod 10,
so a substitution that changes a weight-2 digit by five is invisible to it. Luhn over the 80840
prefix catches every substitution and misses the 0-to-9 adjacent transposition, the 2.1%. Both
fields keep `readBackAlways: false`: 95.2% arithmetic coverage is still stronger proof than
reading seven digits aloud, and a failed checksum makes read-back and spell-out mandatory.

---

## Latency

Status: **Measured** on live recognizer sockets and on the local gate; the browser path and
the agent's own timings are **Not measured**.

### Recognizer timings per set

`npx tsx scripts/eer/report.ts eval/<set>`, from the recorded runs. Finalization delay is the
recognizer finalising a turn after the last audio frame, timed on the sending side.

| Set | N | Socket open P50 / P95 | First Turn after open P50 / P95 | Finalization P50 / P95 / max |
|---|---|---|---|---|
| `eval/control` | 40 | 414 / 1027 ms | 1586 / 2652 ms | 76 / 268 / 309 ms |
| `eval/native16` | 40 | 415 / 2067 ms | 1569 / 3328 ms | 77 / 330 / 357 ms |
| `eval/heldout` | 60 | 411 / 487 ms | 1476 / 1633 ms | 79 / 258 / 320 ms |

### Against a budget

`npx tsx scripts/measure/latency-budget.ts` (`make latency-budget`, a `make verify` step). Budgets
and their origins live in `src/domain/latency-budget.ts`.

| Metric | Budget | Origin | Gates build | N | Over budget | Worst |
|---|---|---|---|---|---|---|
| finalization | 500 ms | vendor published P95 target | yes | 80 | 0 | 357 ms |
| socket open | 2500 ms | deployment default | no | 80 | 0 | 2286 ms |
| gate decision | 5 ms | deployment default | yes | 17 | 0 | under 1 ms |

The finalization budget is the vendor's number, so it gates the build. The socket-open ceiling
was set above the worst case already recorded, so failing the build on it would test the data
against a line drawn from the same data; it is counted and does not gate. The gate-decision
budget is ours but sits three orders of magnitude above the observed worst case, so it gates as
an alarm for a structural regression, not as a tuned target.

The gate decision is timed over the 17 word spans of the synthesised fixtures
(`npx tsx scripts/measure/measure-latency.ts`, `make measure`). Its worst case is printed to a
thousandth of a millisecond and moves between runs on a shared machine by more than its own
size, so the table says "under 1 ms" rather than copying one run. A pure function's timing does
not depend on where its input came from, so this is the one published figure a synthesised
fixture feeds. The product's latency comes from the recognizer and the model.

| Not measured | Why |
|---|---|
| turn to turn | needs the agent socket and the browser; `make measure` prints no live figure |
| word to gate decision, browser | word timings never reach the server; it would be a browser measurement, labelled so |
| time to first audio | the vendor timeline carries it per turn; it is not collected into a figure |

---

## Does degraded audio turn a name into its published partner

`npx tsx scripts/measure/analyse-stress.ts`, over `eval/stress/result-plain.json`: every
recording of `eval/dev` and `eval/control` whose spoken name is on the full 2023 ISMP list, 47
names, re-recognized live by `universal-3-5-pro` in four degraded conditions: a telephone band
(300 to 3400 Hz, 8 kHz mu-law), the same with white noise at 10 dB and at 5 dB SNR, and the same
sped up by 1.1. The clean row is the original recording of the same names. Recorded by
`npx tsx scripts/measure/measure-eer.ts --set eval/stress`. Status: **Measured**.

Of the 188 degraded utterances, 186 closed 1000 and are scored. Two closed on a transport
error, both in phone-snr5, and are excluded rather than scored as mishearings: metronidazole
closed 1006 after 663 ms, duloxetine closed 1008 after 144261 ms. The published file is the
second of two sweeps that ran concurrently; the ledger records that sweep as failed because of
those two sessions.

| Condition | N | Errors, 95% Wilson | Errors at or above threshold | Heard as a listed partner | Confident partner substitutions, 95% Wilson |
|---|---|---|---|---|---|
| clean, as recorded on 16 September | 47 | 1 (2.1% [0.4%, 11.1%]) | 0 | 0 | 0 (0.0% [0.0%, 7.6%]) |
| phone | 47 | 0 (0.0% [0.0%, 7.6%]) | 0 | 0 | 0 (0.0% [0.0%, 7.6%]) |
| phone-snr10 | 47 | 3 (6.4% [2.2%, 17.2%]) | 0 | 0 | 0 (0.0% [0.0%, 7.6%]) |
| phone-snr5 | 45 | 14 (31.1% [19.5%, 45.7%]) | 0 | 0 | 0 (0.0% [0.0%, 7.9%]) |
| phone-fast | 47 | 1 (2.1% [0.4%, 11.1%]) | 0 | 0 | 0 (0.0% [0.0%, 7.6%]) |
| all degraded conditions | 186 | 18 (9.7% [6.2%, 14.8%]) | 0 | 0 | 0 (0.0% [0.0%, 2.0%]) |

**Confident substitutions to a published partner under degradation:
0 of 186, 0.0% [0.0%, 2.0%].** The error the pair rule exists for did not occur on this corpus.
At 5 dB SNR 14 of 45 names were misheard, but every one of the 18 errors sat below the 0.95
threshold, so the first reason to re-ask catches each, and none landed on a listed partner.

The recognizer did turn names into **other real drugs**: azacitidine into azithromycin at
0.783, sulfadiazine into thalidomide at 0.840, silodosin into thalidomide at 0.866. A real,
catalogue-valid drug in place of the one said is the error that passes a catalogue check;
these stayed below the threshold, and the pairs are not on the list.

TTS voices, 47 names, white noise rather than a room, one run: this bounds confident partner
substitutions on this corpus below about 2% and says nothing about human speech, accents or
real telephone lines. The pair rule rests on the published list, not on this corpus producing
the error; the replay that stages hydromorphone heard as morphine at 1.00 is labelled as staged.

---

## The held-out set

`eval/heldout`, 60 utterances, recorded by `make eval-heldout`, read by
`npx tsx scripts/eer/report.ts eval/heldout`. Status: **Measured**, opened once.

| Discipline | How it holds |
|---|---|
| Pre-registration | The prediction, the decision rule and what would falsify it are in `eval/heldout-preregistration.md`, written before the audio existed. |
| Seal | `eval/heldout.sha256` holds a digest of `eval/heldout/terms.json` over normalised `sha256sum` lines, so Windows and Linux agree; `make heldout-seal` fails on any change to the set or on a populated set without a seal. |
| Separation | No item shares a term with the development or control corpora; seven tests in `tests/eval/heldout-discipline.test.ts` enforce it. |
| Scoreability | All 60 sessions closed 1000 at 24 s spacing, so by pre-registered rule 3 the run is scoreable. |
| No re-draw | Rule 4: the set is opened once and not re-sampled after seeing the result. Thresholds were tuned on no set, this one included. |

### The rarity hypothesis is not supported

The control corpus suggested that rarer names fail more:
`npx tsx scripts/measure/analyse-rarity.ts` over `eval/control`, n=40, gives 43.8% [23.1%, 66.8%]
for names with at most one catalogue combination (n=16) against 16.7% [6.7%, 35.9%] for more
than one (n=24), with overlapping intervals.

On the held-out set, `npx tsx scripts/measure/analyse-rarity.ts --set eval/heldout --strata 3`
reads the run positionally (the first 20 items are `rare`, the next 20 `mid`, the last 20
`common`, the order `scripts/build/heldout-set.ts` draws them in);
`tests/eval/rarity-stratification.test.ts` pins the table.

| Stratum | N | Errors | EER, 95% Wilson |
|---|---|---|---|
| rare, at most one catalogue combination | 20 | 6 | 30.0% [14.5%, 51.9%] |
| mid, two to four | 20 | 6 | 30.0% [14.5%, 51.9%] |
| common, five or more | 20 | 4 | 20.0% [8.1%, 41.6%] |

The pre-registered rule required non-overlapping intervals between `rare` and `common`; they
overlap heavily. It also predicted a monotonic decline; `rare` and `mid` are identical. The
control corpus's gap does not replicate and is published as a negative result.

### What replicated

Overall entity error rate **26.7% [17.1%, 39.0%]**, against 27.5% on the control corpus: the
recognizer's difficulty with rare drug names generalises to names it was never measured on.
Four of the 16 errors sat at or above the 0.95 threshold. Two of those are misspellings our
sampler drew from the FDA file, where both spellings exist, so the recognizer was scored wrong
for hearing the real word:

| Spoken | Heard | Confidence | What it is |
|---|---|---|---|
| `llevofloxacin` | levofloxacin | 0.991 | registry misspelling |
| `epineprine` | epinephrine | 0.963 | registry misspelling |
| `oteseconazole` | otesiconazole | 0.971 | recognizer error a threshold alone accepts |
| `chlorthalidone` | chlorothalidone | 0.980 | recognizer error a threshold alone accepts |

Excluding the two misspellings: **EER 24.1% [15.0%, 36.5%]** over 58 utterances, with 2 errors
at or above the threshold. Both figures are published; 26.7% is the run as pre-registered.

---

## Live runs on production

`make live-smoke` drives the production deployment in Firefox (Playwright project
`firefox-fake-caller`) with a synthesised caller. Every attempt, failed or refused, is recorded
in `eval/live/runs.json` with its reason, and each run leaves an artefact in `eval/live/`.
Status: **Observed**; these are pass-or-fail scenario runs, not rates.

**What was real:** the page, both AssemblyAI sockets, the vendor's recognizer and managed
language model, the production server, the gate and the order store. **What was synthesised:**
the caller. Every caller line is Windows SAPI speech from `tests/live/lines/`, injected into the
page's microphone track through WebAudio, and the line that answers each agent question is
chosen by a regular expression over the agent's words (`tests/live/responder.ts`). No human
spoke.

| Scenario | Passes when | Billed attempts | Completed | Refused by the budget, not billed | Result |
|---|---|---|---|---|---|
| `clean-order` | the order committed | 8 | 1 | 0 | **Committed**, `live_smoke-2026-09-26T14:52:56.171Z` |
| `lasa-named` | hydromorphone is in the order, the order committed | 3 | 1 | 0 | **Committed**, `live_smoke-2026-09-26T15:06:54.756Z` |
| `yeah-no` | the read-back was refused, not confirmed | 2 | 1 | 1 | **Completed**, `live_smoke-2026-09-26T19:43:57.004Z` |
| `barge-in` | a reply ended interrupted after the barge-in | 2 | 1 | 1 | **Completed**, `live_smoke-2026-09-26T19:44:53.984Z` |
| `npi-groups` | the ten-digit NPI is in the order | 2 | 0 | 2 | **Not observed** |
| `commit-hold` | the early commit was refused in hold, the order committed | 2 | 0 | 1 | **Not observed** |

The two committed orders, from their artefacts:

| Scenario | Drug | Fields written by read-back | Fields written by validator |
|---|---|---|---|
| `clean-order` | lisinopril 10 mg tablet | drug, strength, form, quantity, sig, patient name | NPI, DEA, route |
| `lasa-named` | hydromorphone 2 mg/ml injection | drug, strength, form, route, quantity, sig, patient name | NPI, DEA |

For `npi-groups` and `commit-hold`, the first billed attempt of each failed with its reason
recorded, and one further attempt was refused before any socket opened, because one client may
spend at most half of the daily socket budget. On the second attempt of `npi-groups` both tokens
were issued but the browser could not open either socket, and the page now names that fault
`socket_unreachable` instead of a token failure. On the second attempt of `commit-hold` the hold
refused the early `commitOrder` as intended, but the order never committed: the agent quoted the
caller before the recognizer had closed the caller's turn, and the proposals were refused. The
route now waits longer and answers `E_QUOTATION_NOT_YET_RECEIVED`, a request to retry, while the
turn is still arriving. Neither scenario has a passing run. Seven further billed
attempts, before the series in the table, reached no committed order; each is in
`eval/live/runs.json` with its reason. Socket time for every live-smoke run is the harness wall
clock across its sockets, an upper bound.

---

## Paid runs and spend

### Runs made before the spend ledger

`npx tsx scripts/report/live-run-count.ts` (`make live-runs`) counts every paid session from the
artefact each run left, so a run cannot be omitted by forgetting to record it. Status:
**Measured**.

| Run | Sessions | Closed 1000 | Closed 1008 | Socket time |
|---|---|---|---|---|
| `eval/dev/result-plain.json` | 40 | 40 | 0 | 204.2 s |
| `eval/control/result-plain.json` | 40 | 40 | 0 | 216.1 s |
| `eval/native16/result-plain.json` | 40 | 40 | 0 | 216.8 s |
| `eval/units/result-plain.json` | 12 | 12 | 0 | not recorded |
| `eval/heldout/result-plain.json` | 60 | 60 | 0 | 306.1 s |
| a pass at 1 s spacing, not kept | 40 | 19 | 21 | not recorded |
| four of those files re-run at 24 s spacing, not kept | 4 | 4 | 0 | not recorded |

The two runs without an artefact are counted from this report's account of them, which is
weaker evidence than a file. The 1 s pass printed a 52.5% entity error rate: all 21 of its
failures closed **1008**, the rate limiter, and all 19 successes closed 1000, so it measured the
rate limiter, not the recognizer, and is discarded. The four files re-run at 24 s spacing
produced no errors.

**Totals: 7 runs, 236 sessions opened, 21 closed by the rate limiter, 0 with any other close
code.** Socket time is on record for 4 of the 7 runs, 943.2 s in total, which at USD 0.45 per
hour for one streaming socket is **USD 0.1179, a floor and not the bill**: 56 sessions have no
recorded duration. Every one of these runs predates the ledger's first entry, so
none of them is in the ledger and none of the ledger's runs is among them.

### Runs recorded in the ledger

`npx tsx scripts/report/spend-report.ts` (`make spend`) derives cost from
`eval/spend-ledger.json`, where each paid run is recorded when it happens, at the rates checked
on 2026-09-17 against the vendor's pricing page (agent USD 4.50, STT USD 0.45, medical USD 0.15
per hour). It prints:

```
recorded paid runs: 45
runs that did not complete, still billed: 35
attempts refused before any socket opened, so not billed: 5
total socket-open time: 11744.868 s
derived total: USD 13.3807
```

The figure is arithmetic over recorded seconds, not an invoice. By command:

| Command | Runs | Outcome | USD | What it is |
|---|---|---|---|---|
| `scripts/report/probe-stt.ts` | 2 | completed | 0.0023 | a recognizer token and socket check |
| `scripts/measure/measure-eer.ts --set eval/stress` | 2 | 1 completed, 1 failed | 0.3127 | the stress set, two concurrent sweeps |
| `make live-smoke` | 26 | 4 completed, 22 failed | 8.8595 | the scenario runs above; 5 more refused at 0 s |
| `scripts/report/probe-witness.ts` | 1 | completed | 0.0143 | one agent session whose vendor timeline is committed as `eval/fixtures/witness/timeline-recorded-shape.json` |
| reconciliation from the vendor session list | 1 | failed | 0.0783 | agent seconds on the vendor's session list not itemised by another row |
| ad-hoc `agent_not_found` diagnosis | 1 | failed | 0.0708 | scripted agent sockets |
| ad-hoc region and tool diagnosis | 1 | completed | 0.0850 | about thirty short agent sockets, recorded as 60 s, an upper bound |
| text-driven managed-model probe | 3 | 3 failed | 0.6835 | the agent socket alone, driven by `conversation.message` |
| audio-driven managed-model probe | 7 | 7 failed | 2.8295 | the agent socket alone, driven by SAPI audio |
| tool-call probes | 1 | completed | 0.4448 | eleven short sessions with a one-tool agent |

Probe rows that used the agent socket alone are recorded at the three-socket rate, an upper
bound.

**Paid runs on record, artefacts plus ledger: 52.** The one figure a human verified against the
vendor is the account balance, USD 149.93 on 17 September, read off the AssemblyAI dashboard; no
later reading is recorded, so no vendor-verified figure covers the ledger runs.

### Socket close codes

Counted over every recorded run. The vendor documents none of these codes; each is an
observation.

| Code | Meaning | Count |
|---|---|---|
| 1000 | normal | 215 over all 7 runs before the ledger (`make live-runs`); 186 more in the 25 September stress run |
| 1006 | abnormal closure, no close frame | 1, in the stress run, excluded from scoring |
| 1008 | rate limiter, billed regardless | 22: 21 in the discarded 1 s pass, 1 in the stress run, excluded from scoring |
| 3007 | malformed audio chunks | not measured |
| 3008 | three-hour cap reached | not measured |
| 3009 | session limit exceeded | not observed; exceeding the session rate produced 1008 instead |

---

## Human voices

Not measured. The stratum is three team members reading
[eval/live/voice-set.md](live/voice-set.md) once each, 25 lines per speaker. The manifest is
built by `npx tsx scripts/build/live-set.ts`, which records a SHA-256 per WAV; the paid pass is
`make eval-live` (`npx tsx scripts/measure/measure-live.ts --confirm-paid`), which refuses to
open a socket without that flag. Until the audio exists, `npx tsx scripts/report/live-report.ts`
prints exactly this:

```
human voices: not measured (0 of 75 audio files present)
pauses between identifier digit groups: not measured
keyterms ablation on human voices: not measured
```

Once measured it prints the Wilson interval overall and per speaker with n, every misheard line
by id, the count of natural LASA mishearings (a zero printed as zero), identifiers read back
digit for digit, false confirmations on the two non-command lines, the pause distribution
between identifier digit groups against the 400 ms streaming default, and the keyterms ablation.

---

## What is not measured

| Not measured | Why, and what would produce it |
|---|---|
| Accuracy on human speech | No open English corpus of drug-name speech was found; see *Human voices*. |
| Reproducibility | No set has been run twice; see below. |
| Keyterms ablation | Only the arm without `keyterms_prompt` exists; see below. |
| Threshold optima | Thresholds are chosen defaults, tuned on no set. |
| Turn-to-turn latency and browser timings | See *Latency*. |
| NPI existence against the live registry | Test NPIs are synthetic and checksum-valid; the registry would return "not found" for all of them. |
| How often a caller answers a plain read-back by reflex | The A/B table counts what a reflex yes would write; the behaviour itself is not measured. |
| The gate's catch and false-ask rates on the held-out set | Not scored. |

**Reproducibility is not measured.** The figure would be the discrepancy, not the agreement,
between two runs of one unchanged set, and one run cannot disagree with itself.
`make eval-repeat` writes a second run of `eval/dev` to `result-plain-run2.json` instead of
overwriting the first; the recorded `eval/dev` run used 204.2 s of socket time, under USD 0.03.
`eval/control` and `eval/native16` differ on purpose and are not a reproducibility pair.

**The keyterms ablation has one arm.** `make eval` sends no `keyterms_prompt`;
`make eval-keyterms` would send identity keyterms only and write
`eval/dev/result-keyterms.json`, which does not exist, and no figure is derived from one arm.
An arm with LASA-checked drug names in `keyterms_prompt` is refused as a product configuration,
and `make keyterms-purity` fails the build if one reaches it.

---

<p align="center"><sub><a href="../docs/README.md">Documentation index</a> · <a href="../README.md">Project README</a></sub></p>