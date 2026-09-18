# Evaluation report

Every figure in this file carries the command that produced it and the size of the set
it came from. A number without both is not published here. A row that has not been
measured says so; it does not carry a plausible placeholder.

**Status: gate effectiveness is measured; everything that needs the paid API is not.**
Gate effectiveness runs offline because the gate is a pure function. Entity Error
Rate, latency and cost all need live sockets and are marked not measured until a key
exists. The method for each was fixed in advance so a result cannot be chosen after
seeing it.

## Every threshold in this report is a chosen default, not a measured optimum

`drugName` auto-accepts at **0.95**, `strength` at 0.92, others at 0.90
(`src/domain/policy.ts`). Read each of those as **"this deployment chose that number"**,
never as "that number is correct". They were reasoned from the cost of an error per
field before any audio existed, and **no run in this report searched for an optimum.**

The distinction matters because the figures around them *are* measurements. The
coverage matrix says a 0.95 threshold catches 17 of 21 recorded errors and adds 16
false asks — that is measured, at that threshold. Whether 0.93 or 0.97 would do better
is **not measured**, and a reader entitled to assume we tuned it would be assuming
something we did not do.

The same label applies to observed numbers we did not set: roughly 60 seconds before an
idle socket closes, 30 seconds of agent-socket lingering, the three-hour STT cap. Those
are **observed, not documented** by the vendor, and each is stated that way where it
appears.

## Method, fixed before measuring

| Discipline | Rule |
|---|---|
| Held-out set | Labelled once, sealed, opened only for the final run. Thresholds are tuned on the development set and never on this one. |
| Repetition | Latency is reported over at least 30 runs, spaced at least 24 seconds apart, because the free tier allows 5 new sessions per minute and each run opens two sockets. |
| Aggregation | Confidence is aggregated over a span by minimum, never by mean. A mean masks a single failed word, which is the case the product exists to catch. |
| Negative results | A measurement that contradicts a claim is published with its method. An unverified number from a vendor is not a substitute for a measured one. |
| Cost control | Entity Error Rate needs the STT socket only, not the agent. Running it through both would cost $12.75 instead of $1.50 and buys nothing. |

## Entity Error Rate

Measures the recognizer before the gate ever runs.

| Set | N | EER | Confidence P50 | Close codes | Command |
|---|---|---|---|---|---|
| development, LASA terms | **40** | **0.0%** | **0.990** | 1000 only | `make eval` |
| control, safe drugs | **40** | **27.5%** | **0.975** | 1000 only | `make eval-control` |
| control, synthesised natively at 16 kHz | **40** | **25.0%** | **0.976** | 1000 only | `make eval-native16` |

Measured 16 September 2026 against the live recognizer, `universal-3-5-pro`, 24 s
between sessions, 100.7 s of audio, **204.2 s of socket time for $0.0255**.

**0.0% is a result about the corpus, not a boast about the recognizer.** Synthetic
speech from a desktop synthesiser is cleaner than a prescriber on a phone, so this
corpus does not reproduce the mishearing the product exists to catch. Saying so is the
finding: a clean-audio benchmark cannot support the central claim, and any submission
that reports one as evidence of safety is reporting the wrong number.

**This row carries a weaker audit trail than the others, and we say which.**
`eval/dev/result-plain.json` holds the per-utterance `scored` array with every recorded
confidence, `closeCode` and `socketMs` per item, but not the raw `results` array with
word-level timings. The two control runs have both. So the dev row can be re-derived
per utterance, per confidence and per socket duration, which is what the claims above
and the latency and live-run tables below rest on, and it cannot be re-derived per
word. Re-running it costs about $0.026 and has not been spent, because nothing in the
report depends on the word-level detail of this particular set.

**What the same run does establish, and it is the useful part:** four of the forty
terms were heard *correctly* but below the 0.95 threshold for `drugName` —
`metformin` 0.928, `klonopin` 0.936, `morphine` 0.939, `cefazolin` 0.949. That is a
**measured false-ask rate of 10%** on recorded confidences rather than assigned ones,
and it is the price of the threshold, paid on audio where nothing went wrong.

**The 52.5% that was not published.** The first full pass reported 52.5% EER with 21
items transcribing as nothing at confidence 0.000. Before publishing it I checked the
close codes: all 19 successes closed 1000 and all 21 failures closed **1008**, a
perfect correlation. The spacing was 1 s against a documented limit of 5 new sessions
per minute, so the 52.5% measured the rate limiter, not the recognizer. Re-running four
of those exact files at 24 s spacing produced 0 errors. The number is recorded here
because a discarded measurement with its cause is worth more than a clean one with no
audit trail.

### The control corpus is where the claim stops being an argument

Forty single-word generic names drawn with a fixed seed from the 3 730 in the built
catalogue, excluding every term in the pair table, 6 to 16 letters, same synthesiser
and same carrier phrase. **27.5% entity error rate**, 101.8 s of audio, 216.1 s of
socket time, **$0.0270**.

The difference from the 0.0% on the pair terms is the finding: the pair terms are
common drugs the recognizer knows, and the control set drew names like `zidesamtinib`
and `inavolisib`, which it does not. A benchmark built only from famous drug names
measures familiarity, not safety.

**Two of the eleven errors carried a confidence above the 0.95 threshold for
`drugName`:**

| Spoken | Heard | Confidence | A threshold alone would |
|---|---|---|---|
| `vinorelbine` | `venorelbine` | **0.981** | **accept it** |
| `glycopyrronium` | `glycopyrrhonium` | **0.955** | **accept it** |

These are recorded confidences, not assigned ones. On this corpus a confidence
threshold alone would have written **2 wrong drug names of 40** into the order while
re-asking **8 correct ones**, which is the product's central claim measured rather
than asserted: the recognizer can be wrong and confident at the same time, and the
number that reports how clearly it heard a sound cannot tell you it heard the wrong
word.

Neither error is in the ISMP pair table, so the pair check would not have caught these
two either. **Saying so is the honest version of the claim:** the pair check covers a
published, named class of confusion, and it is the confidence threshold plus the
validators plus the read-back that cover the rest. A submission claiming one mechanism
catches everything would be claiming something this corpus disproves.

### The attack that could have invalidated the headline number, closed by measurement

Audio is synthesised at 22050 Hz and brought to 16000 by linear interpolation with
**no anti-aliasing filter**. A 1.378 downsample folds everything above 8 kHz back into
the speech band, and that band carries the fricatives which distinguish
`vinorelbine` from `venorelbine` and `glycopyrronium` from `glycopyrrhonium`. Both
above-threshold observations could therefore have been artefacts of **our own code**
rather than properties of the recognizer. Measured energy above 8 kHz in a sample
file: **0.75% of the spectrum** — small, but not zero.

Settled by execution rather than argument: the same forty terms were synthesised
**directly at 16 kHz** through `SpeechAudioFormatInfo(16000, Sixteen, Mono)`, so
`resampleLinear` returns early and never runs.

| Arm | EER | `vinorelbine` | `glycopyrronium` |
|---|---|---|---|
| resampled 22050 to 16000 | 27.5% | wrong at 0.981 | wrong at 0.955 |
| synthesised natively at 16000 | 25.0% | **wrong at 0.984** | **wrong at 0.963** |

Paired over the forty terms: **ten of the eleven errors occur in both arms**, one
differs (`apixaban`, wrong only in the resampled arm), and none is wrong only at native
rate. One discordant pair out of eleven errors, so the resampler accounts for at most
one error and not for the result. **Both above-threshold mishearings reproduce without
our resampling in the path, at a slightly higher confidence than before.**

Publishing this is the point: the measurement was run to try to destroy our own
headline figure, and the figure survived with its cause identified.

### The gate would have confirmed a federally void order, and the data to stop it was already present

`data/catalog.json` carries `deaSchedule` for **193 drugs** — CII 74, CIII 40, CIV 64,
CV 15 — and until this change **no code in `src/gate/` or `src/domain/policy.ts` read
it.** `FieldName.Refills` was validated by an integer range of 0 to 11 with no link to
the drug.

Verified by execution before the fix: `morphine sulfate` with five refills produced
`accept` and `A_VALIDATOR_PASSED_HIGH_CONF`. Under **21 CFR 1306.12(a)** the refilling
of a Schedule II prescription is prohibited outright, so the gate was confirming an
order that cannot legally exist — with full provenance and a green verdict attached.

That is worse than a plain mishearing. A misheard value looks uncertain; this one
looked proved.

| Input | Before | After |
|---|---|---|
| `morphine sulfate`, 5 refills | accepted | **refused**, cites 21 CFR 1306.12(a) |
| `morphine sulfate`, 0 refills | accepted | accepted |
| `alprazolam` (CIV), 5 refills | accepted | accepted, prohibition does not cover CIV |
| `lisinopril` (no schedule), 5 refills | accepted | accepted, range check only |

**One rule, and the restraint is the point.** State day-supply caps for controlled
substances vary by jurisdiction and we have no validated source for them, so exactly
one federal rule is implemented and the rest are named as deliberately absent. A
compliance engine built on guessed rules would be the failure mode this project exists
to argue against.

The refusal also does not borrow the wrong words. A checksum failure asks the caller to
spell the value out, which is right for a typo and absurd for a legal prohibition, so
the gate now distinguishes them: **"morphine sulfate is Schedule II and 5 refills were
heard; a Schedule II prescription may carry none. Shall I record none?"**

This adds no fourth reason to re-ask. It rides the existing validator branch, and
`make gate-mutation` still kills 11 of 11.

### The held-out set, opened once, against a rule fixed before opening it

`eval/heldout`, 60 utterances, `make eval-heldout`. The set was drawn on 16 September,
sealed the same day, and **not read again until this run**. The prediction, the decision
rule and what would falsify the hypothesis were written to
`eval/heldout-preregistration.md` **before** the audio existed.

All 60 sessions closed with code 1000 at 24-second spacing, so by pre-registered rule 3
the run is scoreable. No item shares a term with the development or control corpora,
which seven tests in `tests/eval/heldout-discipline.test.ts` enforce.

**The hypothesis is not supported.** `npx tsx scripts/measure/analyse-rarity.ts --set eval/heldout
--strata 3` reads the recorded run positionally — the first 20 items are `rare`, the
next 20 `mid`, the last 20 `common`, exactly the order `scripts/build-heldout-set.ts`
draws them in — and reproduces this table from the committed `result-plain.json`
without needing the sealed set reopened:

| Stratum | N | Errors | EER, 95% Wilson |
|---|---|---|---|
| rare, at most one catalogue combination | 20 | 6 | 30.0% [14.5%, 51.9%] |
| mid, two to four | 20 | 6 | 30.0% [14.5%, 51.9%] |
| common, five or more | 20 | 4 | 20.0% [8.1%, 41.6%] |

**This table had no command attached to it before this audit.** The figures were
correct — a positional read against `manifest.json` and `result-plain.json` confirms
all three rows exactly — but `scripts/measure/analyse-rarity.ts` supported only a two-way
runtime split (`--set eval/control`, at-most-one vs. more-than-one combination), which
cannot produce three rows of exactly 20. The `--strata 3` mode above is new, added by
this audit, tested in `tests/eval/rarity-stratification.test.ts`, and mutation-tested
against a broken stratum boundary.

The pre-registered rule required non-overlapping intervals between `rare` and `common`.
They overlap heavily. It also predicted a monotonic decline; `rare` and `mid` are
**identical**. The control corpus had suggested 43.8% against 16.7% — that gap does not
replicate, and on the evidence it was sampling noise in a set of 40.

**What this costs us:** a finding. The rarity stratification stays in this report as a
negative result. We publish it because the alternative — quietly dropping a
pre-registered hypothesis that failed — is the exact practice that makes published
benchmarks untrustworthy, and because the set can only be opened once.

**What replicated, and it is the part the product rests on.** Overall entity error rate
**26.7% [17.1%, 39.0%]**, against 27.5% on the control corpus: the recognizer's
difficulty with rare drug names generalises to names it had never been measured on.
Four of the 16 errors sat at or above the 0.95 threshold, so a confidence check alone
would have written them into an order.

### Our own corpus builder had a defect, and the held-out run exposed it

Two of those 16 "errors" are not recognizer errors:

| Spoken | Heard | Confidence |
|---|---|---|
| `llevofloxacin` | levofloxacin | 0.991 |
| `epineprine` | epinephrine | 0.963 |

**Both spoken forms are misspellings that exist in the FDA catalogue**, verified by
lookup: `llevofloxacin` and `levofloxacin` are both present, as are `epineprine` and
`epinephrine`. Our sampler drew the typo, the synthesiser pronounced it, and the
recognizer was scored wrong for hearing the real word.

This is the same 28 registry misspellings `make audit-catalog` found in our own
catalogue, arriving as a measurement defect rather than a curiosity. It is also the
reason the catalogue check **refuses** an unknown name instead of correcting it to the
nearest known one.

Excluding those two items: **EER 24.1% [15.0%, 36.5%]** over 58 utterances, with 2
errors at or above threshold (`oteseconazole` → `otesiconazole` at 0.971,
`chlorthalidone` → `chlorothalidone` at 0.980). Both figures are published because
choosing the flattering one after seeing them is the failure this report exists to
avoid. The 26.7% is the run as pre-registered; the 24.1% is the run with a defect we
found in ourselves, named.

**Not fixed by re-drawing the set.** Rule 4 of the pre-registration says the set is
opened once, with no re-draw after seeing the result. Re-sampling to remove the typos
would be exactly the tuning the seal exists to prevent.

### Another team measured our central claim on the live API, independently

Our thesis is that recognizer confidence does not protect against homophony. Every
figure supporting it in this report is ours, which is the weakest possible position for
a claim this load-bearing.

A competing submission in the same hackathon published a live run that failed **their
own** validation and froze the report rather than re-running it. Their caller said
*HarborHome Repairs*; `universal-3-5-pro` returned **Harbour Rome Repairs**. The
word-level confidences on the wrong words were **0.408 and 0.385**, while the
**turn-level confidence was 0.882**.

That is our argument stated by someone who was not trying to make it:

* A turn can read as confident while the words that matter are not. A system thresholding
  on the turn accepts it; this is why our policy takes the **minimum** confidence across
  the source words and not the mean, and why `E_LOW_CONFIDENCE` names that choice.
* The substitution is a proper-noun homophone — *Harbour Rome* for *HarborHome* — which
  no amount of acoustic certainty distinguishes. In their domain it is a company name;
  in ours it is a drug.

**What it does not prove.** Their error was caught by low word confidence, so it is
evidence for our first re-ask reason, not our third. The case our LASA rule exists
for — high confidence on a wrong real drug name — remains supported only by our own
four above-threshold errors across 100 recorded utterances. Naming that limit is the
point of citing their run at all.

Source: EvidenTurn, AssemblyAI Voice Agent Hackathon, observed 17 September 2026. We
did not reproduce their run and are not asserting their number; we are recording that
an independent measurement of the same phenomenon exists and where it came from.

### Two of our own guarantees were bypassable, and we found it by attacking them

The product's central claim is that a value cannot enter an order outside the gate,
because there is no code path. `make gate-invariant` is the machine that enforces it.
**It was bypassable.**

TypeScript has two forms of type assertion. The check scanned for `as ConfirmedValue`
and not for the older `<ConfirmedValue>raw`. A file using the angle-bracket form forged
a value and wrote it into an `Order`, and `biome check`, `npx tsc` and
`make gate-invariant` were **all three green at the same time**. The `any` route was
closed only by accident, by a biome rule rather than by the invariant, and would have
reopened at the first `// biome-ignore`.

Separately, `make secrets` claims the API key never reaches the browser. `grep
--exclude-dir=api` excludes *any* directory named `api` at *any* depth, so a file at
`src/features/api/leak.ts` reading `process.env.ASSEMBLYAI_API_KEY` passed. Verified by
execution before and after: the same file now fails the check by name.

Both are fixed, and both fixes were verified the same way — write the exploit, watch it
pass, apply the fix, watch the same exploit fail. The exploits are kept as tests rather
than deleted, and the key's absence is now checked against the **built bundle**: after
`next build` the key appears in exactly `.next/server/app/api/tokens/{stt,agent}/route.js`
and nowhere in `.next/static`.

The secrets check also gained a property it lacked: it now **fails if the key is absent
from `app/api` entirely**. Before, renaming the variable would have produced a green
result while checking nothing — the same defect class as a mutation check that passes
when the file it mutates is missing, which this project had fixed once already and
reintroduced elsewhere.

**Why this belongs in a measurements report.** A guarantee nobody attacked is a claim,
not a guarantee. The interesting number here is not that two checks were weak; it is
that both were found by deliberately trying to defeat them, and that the attempt is
what the checks now contain.

### We said DEA and NPI were equally provable. Exhaustive enumeration says otherwise

`make audit-checksums`, every single-digit substitution and every adjacent
transposition of 200 valid identifiers of each kind — 30 600 mutations, exact coverage
rather than an estimate.

| Identifier | Single-digit substitutions | Adjacent transpositions |
|---|---|---|
| NPI, Luhn over 80840 plus nine digits | **100.0%** (18000/18000) | 97.9% (822/840) |
| DEA, mod-10 over seven digits | **95.2%** (12000/12600) | **100.0%** (640/640) |

`CLAUDE.md` states that "NPI and DEA are provably checkable, so they carry
`readBackAlways: false`" — one sentence covering both fields. **That is true of NPI and
4.8% false of DEA.** The DEA scheme weights alternating digits by 1 and 2 and sums mod
10, so a substitution that changes a weight-2 digit by five is invisible to it. Luhn
over the 80840 prefix has no such gap for substitutions, and its own weakness is
elsewhere: it misses the 0-to-9 adjacent transposition, which is the 2.1%.

**The policy is unchanged and that is deliberate.** A 95.2% arithmetic check is still
far better proof than reading seven digits aloud, so `readBackAlways: false` remains
correct for both. What changes is the claim: the two checks are not equivalent, and the
weaker one is named. Four tests in `tests/validators/checksum-coverage.test.ts` pin
both figures, including one that fails if DEA coverage ever silently becomes complete.

### A third failure class, found in our own recorded errors

The report above concedes that the two above-threshold mishearings are caught by
nothing: not by confidence, not by the pair table, not by the catalogue. Looking at
the error strings rather than the rates closes that gap.

Of the **21 errors** across the two control runs, **10 preserve the consonant
skeleton** — the word with vowels, `y`, `h` removed and `ph` folded to `f`:

| Spoken | Heard | Skeleton | Confidence |
|---|---|---|---|
| `vinorelbine` | `venorelbine` | `vnrlbn` | 0.981 / 0.984 |
| `glycopyrronium` | `glycopyrrhonium` | `glcprrnm` | 0.955 / 0.963 |
| `pemigatinib` | `pamigatinib` | `pmgtnb` | 0.885 / 0.871 |
| `encorafenib` | `encarafenib` | `ncrfnb` | 0.921 / 0.940 |
| `imiglucerase` | `imiglicerase` | `mglcrs` | 0.633 / 0.745 |

**Both above-threshold errors are in this set.** The pattern is an unstressed-vowel
substitution inside an otherwise correct consonant frame, which is what a recognizer
does when it hears the word but resolves an ambiguous vowel wrongly.

Built into the catalogue as a skeleton index and measured over all **120 recorded
utterances**:

| Figure | Value | Command |
|---|---|---|
| errors whose true name the skeleton recovers | **10 of 21** | `make coverage-matrix` |
| correct values wrongly given a neighbour | **0** | `make coverage-matrix` |
| distinct skeletons over 3730 drugs | **5707** name forms indexed | `make audit-catalog` |

**Zero false positives, and that is by construction rather than by tuning:** the
lookup only runs when the heard value is absent from the catalogue, and it never
offers the caller the word they just said. A value that exists is never second-guessed,
so the mechanism adds no questions to the false-ask rate.

It does not become a fourth gate branch. It enriches the existing `E_VALIDATOR_CATALOG`
refusal, which already fires on an absent drug name — so the gate keeps its three
reasons and the refusal gains the recovered name:

```
no prescription product in the built catalogue matches "venorelbine";
the same consonant skeleton "vnrlbn" belongs to vinorelbine,
which a vowel substitution would explain
```

**Limitation, stated rather than discovered:** 10 of 21 means eleven errors are not
recovered, and the mechanism cannot help when the misheard value happens to be a real
drug — which is exactly the case the ISMP pair table covers. The three mechanisms
cover different things, and none of them covers everything.

### How often that uncovered case actually exists, measured on the catalogue we ship

The limitation above names a case: the misheard value happens to be a real drug, so
the catalogue accepts it and the skeleton has nothing to report. `make audit-catalog`
turns the same detector on our own data to count how often that case is even possible.

Over the **3730 prescription products** in the built catalogue, 131 consonant
skeletons are shared by more than one name:

| What the collision is | Count |
|---|---|
| one name punctuated two ways | 71 |
| a spelling error in the FDA registry itself | 28 |
| **two genuinely different drugs** | **32** |

The last row is the exposed surface. Examples, all from the shipped file:

| Skeleton | Names sharing it |
|---|---|
| `stll` | `sotalol`, `istalol` |
| `rfdn` | `rifadin`, `orfadin` |
| `sprn` | `suprane`, `syprine` |
| `trcnzl` | `itraconazole`, `terconazole` |
| `mglstt` | `migalastat`, `miglustat` |
| `trsmd` | `torsemide`, `etrasimod` |

**None of these 32 pairs is in our curated ISMP table.** They are not published
look-alike pairs; they are pairs that our own vowel-substitution model says a
recognizer could confuse, found by running our detector against our own catalogue
rather than against a regulator's list. `sotalol` is an antiarrhythmic and `istalol`
is a glaucoma eye drop; nothing in the audio distinguishes them if the vowels are
resolved wrongly.

We did **not** add them to the LASA table, and the reason is the rule that keeps the
table honest: the table is curated from published regulator lists, and a pair we
derived ourselves is a hypothesis, not a published finding. Feeding our own guesses
into the mechanism that is supposed to be independent of our guesses would make the
LASA catch rate a measurement of our own generator.

What the audit does establish, without any policy change:

* The 28 registry misspellings are why the catalogue check **refuses** an unknown name
  instead of correcting it to the nearest known one. `lamotirigine` is in the FDA file;
  a system that auto-corrected to the nearest catalogue entry would have a 28-name
  corpus of wrong answers waiting for it.
* The 32 real pairs bound the gap the previous section admits. The uncovered case is
  not hypothetical, and it is also not large: 32 pairs out of 3730 products.
* Six tests in `tests/catalog/self-audit.test.ts` pin the classification, including one
  that fails if a transposition is ever counted as a distinct drug — the mistake the
  first version of this audit made, which inflated the real-pair count from 32 to 38.

### A class we expected to matter, measured as not mattering on this corpus

`make eval-units`, 12 utterances, every combination of four amounts and three unit
classes in a fixed carrier phrase, scored through `normalizeStrength` — the same
normaliser the product uses.

| Figure | Value |
|---|---|
| strength not recovered exactly, 95% Wilson | **0.0% [0.0%, 24.2%]** |
| wrong unit class, the thousandfold error | **0 of 12** |

Milligrams against micrograms is a factor of a thousand, it has no published pair list
and no checksum, so neither of the product's two strong mechanisms covers it. The
recognizer did not confuse them once.

**This is published because it is the answer, not because it flatters us.** The
interval says 12 utterances cannot rule out a rate as high as 24%, so the honest
statement is that this corpus found no unit-class error and is too small to bound the
risk tightly. A submission that only published the classes where it looked good would
be selecting its evidence.

**The related defect was real, and it was ours.** The catalogue stores `ug` while
speech normalisation emits `mcg`, so "one hundred micrograms" was **rejected** against
a drug that exists — a false refusal on a valid prescription, the opposite of the
product's purpose. Found by writing this corpus, fixed in `normalizeStrengthText`, and
covered by a test built from real FDA rows.

### Confidence calibration, measured over 120 recorded utterances

`npx tsx scripts/measure/analyse-calibration.ts`, pooling every recorded run: `eval/control`,
`eval/dev`, `eval/native16`.

| Reported confidence | N | Heard correctly | Observed accuracy, 95% Wilson |
|---|---|---|---|
| 0.99 and above | 44 | 44 | 100.0% [92.0%, 100.0%] |
| 0.95 to 0.99 | 39 | 35 | **89.7% [76.4%, 95.9%]** |
| 0.90 to 0.95 | 13 | 11 | 84.6% [57.8%, 95.7%] |
| 0.80 to 0.90 | 6 | 3 | 50.0% [18.8%, 81.2%] |
| below 0.80 | 18 | 6 | 33.3% [16.3%, 56.3%] |

**Corrected figure.** An earlier version of this section reported 80 utterances,
pooling only `eval/control` and `eval/dev` from before `eval/native16` existed. The
script always pools every recorded EER set by design; the text had not been
re-generated after a third set was added. The number every row here now carries is
what `npx tsx scripts/measure/analyse-calibration.ts` prints today, over all three sets.

**The curve is monotonic, so confidence is not noise** — a higher reported number does
mean a better chance of being right, and any claim that the recognizer's confidence is
worthless would be false. That is worth stating plainly, because the product is
sometimes mistaken for making it.

**The claim is narrower and survives the measurement:** in the 0.95-to-0.99 band,
where the `drugName` threshold accepts, observed accuracy is **89.7%**, not 100%. Of
83 utterances at or above the 0.95 threshold, **4 were misheard** — `vinorelbine` as
`venorelbine` at 0.981 and 0.984, and `glycopyrronium` as `glycopyrrhonium` at 0.955
and 0.963, one occurrence of each pair from `eval/control` and one from
`eval/native16`. A threshold set anywhere at or below 0.98 accepts all four.

**Stated limitation, not a footnote:** the corpus is synthesised. No open English
corpus of human speech reading drug names exists, so this measures the recognizer
against synthetic speech, not against human speech. The figure is an indicator of
relative difficulty, not a clinical accuracy claim.

### Our own ratchets were mostly unguarded, and the check that was supposed to notice could not fail

The project's claim is that every ratchet has a positive control: a test that plants a
violation and requires the check to fail. `tests/scripts/ratchet-positive-control.test.ts`
is the machine that enforces it, and it held a meta-test whose whole job was to name any
`VERIFY_STEPS` entry with no control.

That meta-test read `expect(uncovered.length).toBeLessThanOrEqual(uncovered.length)` —
**a quantity compared against itself.** It could not fail under any input. With it
passing, the repository stated that every ratchet was guarded while **two** of them
actually were.

| | Before the audit | After the audit |
|---|---|---|
| Steps in `VERIFY_STEPS` | 20 | 21 |
| Steps with a positive control | **2** | 11 |
| Steps deliberately excluded, each named with its reason | 0 | 10 |

The step count in that table is the count on the day of the audit. `VERIFY_STEPS` in
the `Makefile` is the only current list; read it there rather than from this table.

The exclusions are now listed individually rather than left implicit: `lint`,
`typecheck` and `test` fail loudly by themselves; `gate-mutation` and `gate-invariant`
carry their own adversarial proof; `package-size` and `import-cycles` cannot be violated
by a single planted file; `contrast`, `keyterms-purity` and `heldout-seal` have their own
dedicated test files. Anything appearing outside that list now fails the meta-test.

**This is the third instance of the same shape in this repository**, and that is the
finding rather than the individual bugs. `make gate-mutation` once printed `11/11` where
both numbers came from one variable. `make tokens` reported success while its output was
suppressed for every file. Now a meta-test compared a number with itself. In each case the
mechanism was real and the **agreement between two quantities was never actually
checked** — which is precisely the defect class the product itself exists to catch in
speech.

### A declared limit that was never enforced, and two checks that were too slow to run honestly

`scripts/checks/package-size.sh` declared `TEST_LIMIT=30` and referenced it **exactly
once**, in its own declaration. The 30-test-files-per-directory limit that `CLAUDE.md`
describes as enforced did not exist. No directory was over it, so nothing was wrong in
the tree — but the guarantee was not there. It is enforced now, and each tree reports
against its own number rather than borrowing the source limit.

Separately, three ratchets spawned one subprocess per file, which on Windows dominates
the runtime:

| Check | Before | After | Cause |
|---|---|---|---|
| `make ascii` | 38.2 s | **1.2 s** | one `grep` process per tracked file |
| `make package-size` | 17.5 s | **0.6 s** | `dirname` and `basename` per file |
| `make package-subject` | 12.9 s | **4.9 s** | one `grep` process per directory |

Speed is not the point; **it was bought without loosening any check**, and each of the
three now also refuses to pass having scanned nothing, which none of them did before. The
rewrite reproduced the original `pipefail` trap once in the process — a `grep -v` that
matches nothing returns 1 and kills the pipeline — and it is fixed by putting `|| true`
inside a brace group around the grep rather than after the next stage, which is where the
original `make tokens` defect came from.

## Latency

Measured in the browser for word-level timings, and server-side where the API reports
it. The two are labelled separately because they are not the same claim.

| Metric | N | P50 | P95 | P99 | Source | Command |
|---|---|---|---|---|---|---|
| **word span to gate decision** | **18 x 5 runs** | **0.024-0.063 ms** | **0.17-0.43 ms** | — | local, no socket | `make measure` |
| **finalization delay** | **40** | **76 ms** | **268 ms** | max 309 | live STT socket | `make eval-control` |
| **socket open, control only** | **40** | **414 ms** | **1027 ms** | — | live STT socket | `make eval-control` |
| **socket open, all recorded sessions** | **80** | **414 ms** | **1331 ms** | max 2286 | live STT socket, control + native16 | `make latency-budget` |
| **first Turn after open** | **40** | **1586 ms** | **2652 ms** | — | live STT socket | `make eval-control` |
| turn to turn | not measured | — | — | — | browser | `make measure` |
| word to gate decision | not measured | — | — | — | browser | `make measure` |
| time to first audio | not measured | — | — | — | `GET /v1/sessions/{id}` | `make measure` |
| finalization delay | not measured | — | — | — | server | `make measure` |

Word-level timings do not exist in the server-side session record, so word-to-gate
latency is a browser measurement and is labelled as one rather than presented as
server-verified.

**The 1027 ms socket-open P95 published earlier was measured over the control set
alone (n=40).** Over all 80 recorded sessions — control plus native16, the same 40
terms differing only by the resampling ablation described below — the P95 is
**1331 ms**, worst case 2286 ms, computed by `npx tsx scripts/measure/latency-budget.ts` from
the `openMs` field recorded in `eval/control/result-plain.json` and
`eval/native16/result-plain.json`. The P50 is unchanged at 414 ms; the tail moves
because native16 removes the resampling step and its distribution of connection times
differs from control's. Read the 1027 ms figure wherever it appeared before this
correction as the control-only number, not the general one.

**`eval/control` and `eval/native16` are an ablation, not a reproducibility pair.**
Both synthesise the same 40 terms with the same synthesiser and the same carrier
phrase; the only deliberate variable between them is whether the audio is resampled
from 22050 Hz to 16000 Hz before being sent (control) or synthesised natively at
16000 Hz (native16, see *The attack that could have invalidated the headline number*
above). They are not two independent runs of one set, so their agreement or
disagreement says nothing about reproducibility — see the section immediately below.

**Finalization delay is measured against the vendor's own published bar.** AssemblyAI
publishes P95 under 500 ms as the target; over 40 live sessions the P95 was **268 ms**
and the worst single case 309 ms, so **0 of 40 exceeded it**. This is the recognizer
finalising a turn after the last audio frame was sent, measured from our own clock on
the sending side, and it is not a turn-to-turn conversation figure — that needs the
agent socket and a public host for the tool webhooks, neither of which exists here.

**The decision function is not a source of delay**, and that is measurable without any
socket: over the 18 word spans carried by the synthesised fixtures the gate decides in
0.024-0.063 ms at the median across five runs, worst case 0.43 ms, after a warm-up
call so the first invocation does not distort the maximum. A range is published rather
than one figure because a sub-millisecond measurement on a shared machine varies
between runs by more than the quantity itself. The fixtures being synthesised rather
than captured does not weaken this one figure, because the timing of a pure function
does not depend on where its input came from; it is the only published number a fixture
feeds, and it is labelled here. This answers the obvious objection that an
extra check slows the conversation: the check costs microseconds, and whatever latency
the product has comes from the recognizer and the model, not from the gate. It is
explicitly **not** a turn-to-turn figure and does not stand in for one.

## Gate effectiveness

The two sides of the same mechanism. Publishing only the first would make the metric
one-sided.

Measured offline against the built pair table and catalogue. This needs no paid call:
the gate is a pure function, so the comparison runs on a corpus with a known truth.

| Metric | N | Value | Command |
|---|---|---|---|
| mishearings caught, gate on | 20 | **20 / 20** | `make ab-gate` |
| wrong values written, gate on | 20 | **0** | `make ab-gate` |
| wrong values written, gate off | 20 | **12** | `make ab-gate` |
| **false-ask rate, gate on** | 20 | **40.0%** (8 / 20) | `make ab-gate` |
| **false-ask rate, gate off** | 20 | **40.0%** (8 / 20) | `make ab-gate` |
| caller repeat rate | not measured | — | `make measure` |

Corpus: 40 candidates on `drugName`, seed 20260916. Twenty carry a mishearing drawn
from the built pair table; twenty carry the value the human actually said, with
confidences spanning the 0.95 threshold, because a corpus where every correct value is
confident cannot measure the cost of the idea at all. Five tests in
`tests/eval/ab-gate.test.ts` fail if any of these figures stops holding.

**False-ask rate is the cost of the idea** — how often the gate asked when the value
was already correct. It is the only answer to the obvious question of whether the
agent re-asks constantly, and it is reported next to the catches, not beneath them.

**The number that matters is that both configurations pay the same 40%.** Those eight
re-asks are caused by the confidence threshold, which every competing design also has;
the pair check adds none of its own. What it adds is the twelve mishearings on the row
above, which a threshold alone accepted at confidences up to 1.00. The cost of the
idea, measured, is zero extra questions.

**Stated limitation:** these confidences are assigned, not recorded, so this table
describes the decision function exactly and the recognizer not at all. The section
below repeats the same question against **recorded** confidences from the live runs,
which is the version that describes both.

### Which mechanism pays for which re-ask, over recorded confidences

`make coverage-matrix`, over all 80 utterances of the two live runs
(`eval/control/result-plain.json` and `eval/native16/result-plain.json`): 21 recognizer
errors and 59 correct values, every confidence recorded from AssemblyAI rather than
assigned.

Each utterance is assigned to the **first** mechanism that fires in the gate's own
branch order, because that is the order `decide()` evaluates and any other assignment
would be a story rather than a measurement: catalogue absence, then LASA membership,
then the confidence threshold.

| Mechanism | Errors caught | False asks on correct values |
|---|---|---|
| catalogue absence | **21 / 21** | **0 / 59** |
| LASA pair membership | 0 / 21 | 0 / 59 |
| confidence below threshold | 0 / 21 | **16 / 59** |
| nothing fired, value accepted | 0 / 21 | 43 / 59 |

Errors caught by some mechanism: **100.0% [84.5%, 100.0%]** (Wilson, n=21).
Correct values re-asked: **27.1% [17.4%, 39.6%]** (Wilson, n=59).

**Every false ask in the system is charged to the confidence threshold.** Catalogue
absence caught all 21 errors and asked about none of the 59 correct values, because
every correct value was a real drug and every error was not. That is the cost
structure of the idea, measured rather than argued: the mechanism that does the
catching is free, and the mechanism that costs 16 questions caught nothing the other
one missed.

**Four of the 21 errors sat at or above the 0.95 threshold** and a confidence check
alone would have written them into the order:

| Spoken | Heard | Recorded confidence |
|---|---|---|
| vinorelbine | venorelbine | 0.981 |
| vinorelbine | venorelbine | 0.984 |
| glycopyrronium | glycopyrrhonium | 0.955 |
| glycopyrronium | glycopyrrhonium | 0.963 |

A threshold at 0.95 catches 17 of 21 and adds 16 false asks. The catalogue catches
21 of 21 and adds none. This is the product's thesis stated as a table rather than a
claim.

**Why the LASA row is zero, stated before anyone asks.** Both eval corpora are drawn
from rare oncology and biologic names to stress the recognizer, and none of the 21
errors landed on a published LASA pair. The row is zero because of what is in the
corpus, not because the mechanism is inert: `make ab-gate` above exercises it on 20
real pair mishearings and it catches 20 of 20 at confidences up to 1.00. The two
sections measure different things and neither substitutes for the other. A corpus
that could exercise all three mechanisms at once does not exist yet and is named in
*What is not measured*.

**The consonant skeleton names the drug actually spoken in 10 of the 21 errors.**
This is the corrected figure; an earlier draft of this work said 8 of 11, which was
wrong — it counted one corpus and mis-stated its size. Six tests in
`tests/eval/coverage-matrix.test.ts` guard the claims above, including one that fails
if no error ever sits above the threshold, since a zero there would mean our own data
does not support the thesis.

## LASA coverage

`npx tsx scripts/stitch-lasa.ts`, run directly against the built catalogue:

| Figure | Value | Command |
|---|---|---|
| pairs in the curated table | **20** | `make data` |
| pairs with both terms found in the catalogue | **18 / 20** | `npx tsx scripts/stitch-lasa.ts` |
| pairs with one term found | **2 / 20** | `npx tsx scripts/stitch-lasa.ts` |
| pairs with neither term found | **0 / 20** | `npx tsx scripts/stitch-lasa.ts` |
| term match rate, naive exact | **30 / 40 = 75.0%** | `npx tsx scripts/stitch-lasa.ts` |
| term match rate, salt-stripped lookup (includes proprietary names) | **38 / 40 = 95.0%** | `npx tsx scripts/stitch-lasa.ts` |

Catalogue build, same command: **116 240** rows read from the FDA NDC file, **56 619**
after keeping only `HUMAN PRESCRIPTION DRUG`, **11 309** after deduplicating by
(name, strength, form, route), yielding **3 730** distinct drugs. Never hardcode these:
the source file is rebuilt daily.

**Corrected figures, and a corrected method.** An earlier version of this table
reported three sequential stages — naive exact, then salt stripping, then proprietary
names, at 72%, 92%, 95% — implying three scripted passes. `scripts/stitch-lasa.ts` has
never had three stages: its single lookup calls `findDrug`, which normalises through
`normalizeDrugName` (salt stripping) against an index built from
`[nonproprietaryName, ...proprietaryNames]` (`src/catalog/store.ts`), so salt stripping
and proprietary-name matching are one pass, not two. The true two-stage figures the
script actually prints are 75.0% naive and 95.0% after the single stripped-and-proprietary
lookup, a 20-point gain, not the 72%-to-92%-to-95% staircase the old text described.
The end state, 95%, was already correct; the middle number and the three-stage
narrative around it were not.

**Salt stripping plus proprietary matching is worth 20 percentage points here**
(75.0% to 95.0%), because the catalogue stores `tramadol hydrochloride` where the pair
says `tramadol`, and `klonopin`/`oxycontin` only appear as proprietary names. The
figure differs from the 42%-to-52% range quoted for the full ISMP extraction because
this table is the curated 20 pairs, not the ~960 raw ones.

**Two one-sided pairs remain, not three.** `chlorpropamide` and `klonopin` are missing
from both `nonproprietaryName` and `proprietaryNames` under the current catalogue
build; `oxycontin` is not missing — `findDrug` resolves it through `proprietaryNames`,
which the old text's "missing from `nonproprietaryName`" description was technically
true of but presented as if it meant absent from the catalogue entirely. All pairs
still fire regardless: the pair check reads the curated table, not the catalogue, so
even the two genuinely absent terms fire with their partner and their ISMP row cited.
Verified by execution, not by inspection.

## Socket close codes

Counted over every run, because a close code explains a result that otherwise looks
like a latency outlier.

| Code | Meaning | Count |
|---|---|---|
| 1000 | normal | 215, over the 5 runs with a kept artefact (`make live-runs`) |
| 1008 | rate limiter, billed regardless | 21, all in one discarded run measured at 1 s spacing (see below) |
| 3007 | malformed audio chunks | not measured |
| 3008 | three-hour cap reached | not measured |
| 3009 | session limit exceeded | not measured; the documented condition for it has never produced this code in any run we have made |

## Honest count of live runs

**command:** `npx tsx scripts/report/live-run-count.ts`. Counts every paid session from the
artefact each run left behind, so a run cannot be omitted by forgetting to record it.

**7 runs left an artefact in this repository**, covering **236 paid sessions**:

| Run | Sessions | Closed 1000 | Closed 1008 |
|---|---|---|---|
| `eval/dev/result-plain.json` | 40 | 40 | 0 |
| `eval/control/result-plain.json` | 40 | 40 | 0 |
| `eval/native16/result-plain.json` | 40 | 40 | 0 |
| `eval/units/result-plain.json` | 12 | 12 | 0 |
| `eval/heldout/result-plain.json` | 60 | 60 | 0 |

**Two further runs left no artefact and are counted anyway, from `eval/REPORT.md`'s own
account of them rather than from a file** — weaker evidence, and named as weaker here:
a 40-session run at 1 s spacing that produced the discarded 52.5% EER figure (19 closed
1000, **21 closed 1008**, the rate-limiter failures in the table above), and a
4-session re-run of some of those same files at 24 s spacing that confirmed the rate
limiter explanation. Their socket duration was never recorded, so their cost is
unknown rather than zero.

**Totals: 236 sessions opened, 21 rate-limiter failures (1008), 0 sessions with any
other close code.** Socket time is on record for 4 of the 7 runs, 943.2 s in total.
At USD 0.45 per hour for one streaming socket, that recorded time alone costs
**USD 0.1179 — a floor, not a total**, because 56 sessions across the 3 runs with no
recorded duration are not included and their true cost is higher by an amount nobody
wrote down.

`eval/spend-ledger.json` was added after these seven runs were made, so it currently
holds 0 of them; that gap is stated rather than closed by back-filling entries whose
socket clocks nobody kept. Runs made from now on are recorded by
`scripts/report/record-spend.ts` at the time they happen, so this gap does not recur.

## Reproducibility: not measured, 0 of 3 sets run twice

**There is no command, because there is nothing to compute.** The figure needs a
second run of one set, and no set has one; the discrepancy, not the agreement, is
what a second run would show. A script that only ever printed "not measured" stood
here and was removed: 223 lines that computed nothing stated the absence no more
honestly than this sentence does. `make eval-repeat` produces the missing input.

**The honest state is not measured: 0 of 3 sets have been run twice.** A second run
is produced with `--repeat 2`, which writes a new file (`result-plain-run2.json`)
instead of overwriting the first, because a destroyed first run would make this
measurement permanently impossible to take.

| Set | First run | Second run |
|---|---|---|
| `eval/control` | 2026-09-16T14:16:40.888Z | not run |
| `eval/native16` | 2026-09-16T15:03:26.637Z | not run |
| `eval/dev` | 2026-09-16T13:55:47.287Z | not run |

**`eval/control` and `eval/native16` are not a reproducibility pair, even though both
exist and both ran the same 40 terms.** They are an ablation: the only deliberate
variable between them is whether the audio was resampled from 22050 Hz to 16000 Hz
(control) or synthesised natively at 16000 Hz (native16). A second run of the same
set, unchanged, is what reproducibility means here, and no set has one. Publishing a
repeat figure from either pair would be exactly the kind of self-confirming assertion
this report exists to refuse: one run cannot disagree with itself, and two runs that
differ on purpose cannot stand in for two runs that were meant to agree.

Each second run costs roughly the same as the first — about USD 0.026 to USD 0.027
per 40-item set — and opens a paid socket per item, so `make eval-repeat` has not
been run. The command to produce it is `make eval-repeat`.

## Keyterms ablation

**No figure exists, and none is invented in its place.**

The design is two arms on the same recorded set, differing in exactly one parameter:

```text
make eval             no keyterms_prompt at all, writes eval/dev/result-plain.json
make eval-keyterms    identity keyterms only, writes eval/dev/result-keyterms.json
```

`eval/dev/result-plain.json` exists (measured 2026-09-16T13:55:47.287Z, 40 items, 0
keyterms sent). `eval/dev/result-keyterms.json` does not exist, so
the second arm is absent rather than equal to the first: an arm nobody ran cannot be
equal to the other one, and no figure is derived from one arm. Running it costs
roughly USD 0.05 in total, on the already-recorded set, and has not been spent yet.

**The drug-name arm — keyterms containing the LASA-checked names the rules check —
is refused by name, not merely unrun.** Feeding the recognizer the exact strings the
rules look for would make the observation depend on the verification: a recognizer
biased toward `bisoprolol` and `lisinopril` no longer tells you anything independent
about whether it would have heard either one on its own. If that arm is ever run at
all, it is a diagnostic that sizes the sacrifice of biasing, never a candidate product
configuration, and `make keyterms-purity` fails the build if a LASA-checked name ever
reaches `keyterms_prompt` regardless.

## What is not measured, and why

| Not measured | Reason |
|---|---|
| Accuracy on human speech | No open English corpus of drug-name speech exists. Synthesising it is the honest fallback, and the limitation is stated wherever the number appears. |
| NPI existence against the live registry | Our NPI numbers are synthetic, generated to satisfy the checksum. Querying the real registry would return "not found" for arithmetically valid numbers and would only add noise. |
| Threshold optima | Thresholds are initial values reasoned from the cost of an error per field. Tuning happens on the development set; the held-out set measures the result once. |
| Keyterms with drug names included | Methodologically invalid as a product option, since it biases the recognizer toward the exact strings the rules look for. If run at all, it is a diagnostic that sizes the sacrifice, never an alternative configuration. |
