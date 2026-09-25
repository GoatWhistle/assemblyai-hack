# The evidence base: what we assumed, what we measured it with, at what n

The format is the same for every entry: **the assumption → what it was measured with →
at what n → what that n is not enough for**. The last column is mandatory. A claim with
no boundary on its own applicability looks stronger than it is, and that gap is exactly
what makes published benchmarks untrustworthy.

The full numbers with their commands are in [../eval/REPORT.md](../eval/REPORT.md). Here
there is only the boundary of each one.

## The product's central claim

**We assumed:** high recogniser confidence does not protect against homophony — that is,
the model can be certain it heard one name when another was spoken.

**What we measured it with:** a run over the recorded corpus recording the confidence
AssemblyAI returns, plus a coverage matrix — which of the gate's three mechanisms fires
first on each recording.

**At what n:** 80 recordings, of them **21 errors and 59 correct values**. Separately a
held-out set of **60 recordings**, opened once.

**What that n is not enough for.** It shows the recognizer can be confident and wrong:
two genuine held-out errors (`oteseconazole` heard as `otesiconazole` at 0.971,
`chlorthalidone` as `chlorothalidone` at 0.980) and two control-set words (`vinorelbine` as
`venorelbine`, `glycopyrronium` as `glycopyrrhonium`, each in two arms) sat **at or above
0.95**, so a confidence-based check alone would have written them into the order. Four of
the sixteen scored held-out errors sat at or above 0.95, but two of those four are our
sampler's typos (`llevofloxacin`, `epineprine`), not recognizer errors. Each confident error
was a non-word the catalogue refuses. **A confident substitution of one real listed drug for
its partner has not been observed on our corpora** (0 of 186 scored degraded utterances,
`npx tsx scripts/measure/analyse-stress.ts`); the pair rule rests on the published list,
not on our data. Nor is the n enough to state a frequency: with 21 errors the Wilson
interval is too wide to claim "such-and-such a percentage of errors are homophonic", and we
do not make that claim.

## Which mechanism pays for which re-ask

**We assumed:** the three reasons to re-ask are not interchangeable, and each one catches
what the others do not.

**What we measured it with:** `scripts/measure/coverage-matrix.ts` — the real validator and the
real `decide()` over every recording, each one attributed to the **first** mechanism that
fired, in the gate's branch order.

**At what n:** 21 errors and 59 correct values.

**What that n is not enough for.** Within the set the result is unambiguous: absence from
the catalogue caught **21 of 21** errors and asked about **not one** of the 59 correct
values. Under the shipped policy every drug name is read back anyway, so the other
mechanisms decide which question a correct value gets, not whether it gets one: **25 of
59** the standing read-back, **13 of 59** the threshold, **21 of 59** a contrastive
question from the pair rule, and none of them reached an error before the catalogue did.
Without the pair rule the threshold takes **16 of 59** and the standing read-back **43 of
59** (`npx tsx scripts/measure/coverage-matrix.ts`). What is missing: the corpus is
synthesised, and the error distribution of real speech may be different. The conclusion
"the threshold is useless" **does not follow** from this — what follows is "on this corpus
it caught nothing the catalogue did not catch", and the difference between those two
formulations is fundamental.

## What the shipped gate asks about correct values

**We assumed:** the cost of the idea is the questions asked about values that were
already right, and it has to be published next to the catches, or the metric is
one-sided.

**What we measured it with:** `npx tsx scripts/measure/coverage-matrix.ts`: the shipped
`drug_name` policy, pair rule on and every drug name read back by regulation, each
correct value assigned to the first branch `decide()` takes.

**At what n:** n=59 correct values, and **59 of 59** are asked about, because the Joint
Commission read-back is policy: the question is never whether to ask, only which question.
The threshold asks **22.0% [13.4%, 34.1%]** of them (13 of 59) instead of the standing
read-back, and the pair rule puts **35.6% [24.6%, 48.3%]** (21 of 59) to a contrastive
question, Wilson intervals. A plain drug-name read-back is about 2.5 s; a contrastive one
naming every published partner is about 11.8 s, 9.4 s more. Both are estimates at the
desktop synthesiser's 2.43 words/s with each spelled letter counted as a word, not a
timing of the agent's voice.

**What that n is not enough for.** The contrastive share belongs to this corpus, whose
names were chosen before the measurement. On the held-out set, in a second reading of the
recognizer output of the one run opened on 16 September and for a rule that was never tuned
on it, the same rule asks **6 of 44** correct values, 13.6% [6.4%, 26.7%], and across the catalogue 502 of 3730 drugs,
13.5%, carry a listed name (`npx tsx scripts/measure/ismp-coverage.ts`). None of these is
weighted by how often a drug is dispensed, and we do not claim a dispensing-weighted rate.
The figure this section used to carry, 27.1% of correct values "falsely re-asked", was
computed without the standing read-back and does not describe the shipped gate.

## What the pair rule adds over a plain read-back

**We assumed:** a plain read-back already exposes a mishearing to the caller, so the pair
rule has to add something a read-back does not: protection against a caller who hears
the wrong name read back and says yes by reflex.

**What we measured it with:** `npx tsx scripts/measure/ab-gate.ts`: 40 candidates, seed
20260916, through three arms of the real policy. A reflex yes writes whatever the
threshold or the standing read-back asked about, and never what the pair rule asked
about, because only a spoken name answers a contrastive question.

**At what n:** 20 correct values and 20 recognizer mishearings inside a curated pair. With
the pair rule a reflex yes writes **0 of 20** mishearings; without it, **20 of 20**, at a
cost of 4 contrastive questions on the 20 correct values. The two arms differ by one flag,
`lasaChecked`, and both read every drug name back.

**What that n is not enough for.** The mishearings are constructed, each one substituting
a curated partner for the spoken name, and the reflex yes is modelled as the worst caller
rather than measured. The comparison shows what the rule does to a mishearing that
happens; how often a recognizer produces one confidently is a separate measurement
(`npx tsx scripts/measure/analyse-stress.ts`).

## The published list as the product rule

**We assumed:** a pair rule is only as good as the list behind it, so the whole published
list has to be the rule, not a hand-picked subset.

**What we measured it with:** `npx tsx scripts/measure/ismp-coverage.ts` over
`data/lasa-pairs.json`, parsed from the ISMP List of Confused Drug Names, updated through
February 2023, with the page and row of each pair kept.

**At what n:** 1056 rows parsed and 0 row groups left unresolved; **514 distinct pairs**
over **754 names**, the 20 curated pairs each a row of it. 204 pairs have both names in the
catalogue and 153 one; 124 listed names reach the catalogue only as a brand. The
consonant-skeleton distance between the two names of a pair has median 2 and is measured,
not used as a filter: 14 pairs sit at distance 0 and 10 at 10 or more.

**What that n is not enough for.** The count is exact for the 2023 edition and says
nothing about confusions the list does not publish: lisinopril and bisoprolol,
AssemblyAI's own example, are on neither tier. A brand name is matched only through the
catalogue's `proprietaryNames`, so a brand the catalogue does not carry is not checked.

## Name rarity as a factor

**We assumed:** rare drug names are recognised markedly worse than common ones. The
prediction, the decision rule and the falsification condition are recorded in
[../eval/heldout-preregistration.md](../eval/heldout-preregistration.md) **before the
audio existed**.

**What we measured it with:** the held-out set, three strata by number of combinations in
the catalogue, Wilson intervals. The rule required **non-overlapping** intervals between
`rare` and `common`.

**At what n:** 60 recordings, 20 per stratum.

**What that n is not enough for.** The hypothesis **was not confirmed**: the intervals
overlap heavily, and `rare` and `mid` coincided exactly (30.0% each). The control corpus
had previously shown 43.8% against 16.7% — the gap did not reproduce and, to all
appearances, was sampling noise on a set of 40. At 20 recordings per stratum this design
cannot detect a difference smaller than roughly twenty percentage points, so the honest
conclusion is **"not shown"**, not "no effect". The set is sealed and opened once, so more
n cannot be added: this is the final result for this set.

## Arithmetic checkability of DEA and NPI

**We assumed:** both identifiers are checkable by arithmetic, so both are equally
protected and both may go unread aloud.

**What we measured it with:** `make audit-checksums` — an **exhaustive** enumeration:
every single-character substitution and every transposition of adjacent digits for 200
valid identifiers of each kind, **32,080 mutations**.

**At what n:** n is not a sample but the complete enumeration of the stated space. That is
precisely why this is the strongest entry in the file.

**What that n is not enough for.** The enumeration is exact within its own space: NPI
catches **100%** of single-character substitutions, DEA **95.2%**. The DEA scheme weights
alternating digits by 1 and 2 and sums modulo 10, so a substitution changing a weight-2
digit by five is invisible to it. What is missing: the enumeration does not cover errors
of two or more characters, and it does not cover insertions and deletions. The policy was
deliberately left unchanged — 95.2% of arithmetic is stronger than reading seven digits
aloud — but the claim of equivalence has been withdrawn.

## Collisions in our own catalogue

**We assumed:** it makes sense to point the similar-name detector not only at incoming
speech but also at the catalogue we ship.

**What we measured it with:** `scripts/measure/audit-catalog.ts` — the consonant skeleton over the
whole catalogue.

**At what n:** the entire shipped catalogue. **131 collisions**: 71 differ only by
punctuation, 28 are registry typos, **32 are genuinely different drugs**.

**What that n is not enough for.** The 32 pairs are real and named, but what to do about
them is a question of policy, not of measurement. The measure "the skeleton matched" is
not the measure "they will be confused in speech": it is knowingly wider. The numbers are
enough to claim the problem exists in our own data, and not enough to claim a frequency
of confusion.

## Latency

**We assumed:** the gate's decision adds no noticeable delay to the conversation.

**What we measured it with:** the gate's decision time over the word spans of the
synthesised fixtures, in Node, with no socket (`make measure`). The browser word-to-gate
path and the server-side `time_to_first_audio_ms` and tool-call timings from
`GET /v1/sessions/{id}` are not measured.

**At what n:** see the Latency section in the report. The gate's decision time is
**18 spans over 5 runs**, P95 **0.17-0.43 ms**, measured locally with no socket by
`make measure` over the fixtures as they stood then; the fixtures now carry 17 spans, and
`npx tsx scripts/measure/latency-budget.ts` finds 0 of 17 over the 5 ms budget. The **268 ms** P95 that appears next to the vendor's 500 ms target is a
different metric on a different set: finalization delay over **40 live sessions**,
`make eval-control`. The two are not interchangeable, and an earlier version of this
section quoted the second figure under the first heading.

**What that n is not enough for.** It is the pure function alone, not a browser
measurement: it **does not include** audio capture, the sockets or the tool round trip. A
word-to-decision figure would have to be taken in the browser, because the vendor does not
hand over word-level timings on the server, and it has not been taken. So this is not "the
delay a human hears" but "the delay the gate adds", and substituting one for the other is
not allowed.

## Confidence as calibration

**We assumed:** the recogniser's confidence can be read as a probability of being right.

**What we measured it with:** calibration over 120 recorded utterances (`eval/control`,
`eval/dev`, `eval/native16`), `npx tsx scripts/measure/analyse-calibration.ts`; all the
confidence values come from AssemblyAI, not from us.

**At what n:** 120 recordings; of the **83 at confidence 0.95 and above, 4 were misheard**
(two words, each in two arms).

**What that n is not enough for.** Enough to refute "0.95 means reliable"; the per-bin
Wilson intervals are wide, so the curve in the report bounds the calibration rather than
pinning it. So in the interface confidence is shown as
the recogniser's own certainty beside the validator's verdict, not as a quality score in
per cent.

## What we did not measure at all

The full list with the reasons is in [limitations.md](limitations.md). In short: accuracy
on human speech (we found no open corpus), the existence of an NPI in the live registry (our
numbers are synthetic), the optimality of the thresholds (they are chosen values, not
measured optima), the size of the market in money (we did not estimate it and we publish no
figure).
