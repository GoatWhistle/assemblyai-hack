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

**What that n is not enough for.** It is enough to show that the class exists: four
errors in the held-out run sat **at the 0.95 threshold and above**, meaning a
confidence-based check would have written them into the order. It is not enough to state
a frequency: with 21 errors the Wilson interval is too wide to claim "such-and-such a
percentage of errors are homophonic". The existence claim is proved, the frequency claim
is not, and we do not make the second.

## Which mechanism pays for which re-ask

**We assumed:** the three reasons to re-ask are not interchangeable, and each one catches
what the others do not.

**What we measured it with:** `scripts/measure/coverage-matrix.ts` — the real validator and the
real `decide()` over every recording, each one attributed to the **first** mechanism that
fired, in the gate's branch order.

**At what n:** 21 errors and 59 correct values.

**What that n is not enough for.** Within the set the result is unambiguous: absence from
the catalogue caught **21 of 21** errors and asked about **not one** of the 59 correct
values, while the confidence threshold gave **0 of 21** and **16 of 59** — that is, on
this corpus the threshold pays only in false re-asks. What is missing: the corpus is
synthesised, and the error distribution of real speech may be different. The conclusion
"the threshold is useless" **does not follow** from this — what follows is "on this corpus
it caught nothing the catalogue did not catch", and the difference between those two
formulations is fundamental.

## False re-asks

**We assumed:** the cost of the idea is re-asks where the value was already right, and it
has to be published next to the catches, or the metric is one-sided.

**What we measured it with:** the share of correct values the gate asked about anyway.

**At what n:** n=59 correct values. **27.1% [17.4%, 39.6%]**, Wilson interval.

**What that n is not enough for.** An interval 22 percentage points wide is an order of
magnitude, not a point. Saying "27%" without the interval is not allowed; saying "roughly
one in four correct answers triggers a re-ask" is.

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
valid identifiers of each kind, **30,600 mutations**.

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

**What we measured it with:** a measurement of the word-to-decision path in the browser,
plus the server-side `time_to_first_audio_ms` and tool-call timings from
`GET /v1/sessions/{id}`.

**At what n:** see the Latency section in the report. The word-to-decision path is
**18 spans over 5 runs**, P95 **0.17-0.43 ms**, measured locally with no socket by
`make measure`. The **268 ms** P95 that appears next to the vendor's 500 ms target is a
different metric on a different set: finalization delay over **40 live sessions**,
`make eval-control`. The two are not interchangeable, and an earlier version of this
section quoted the second figure under the first heading.

**What that n is not enough for.** The word-to-decision measurement is a **browser** one,
because the vendor does not hand over word-level timings on the server, and it is labelled
as a browser measurement everywhere. It **does not include** audio capture. So it is not
"the delay a human hears" but "the delay inside our part of the path", and substituting one
for the other is not allowed.

## Confidence as calibration

**We assumed:** the recogniser's confidence can be read as a probability of being right.

**What we measured it with:** calibration over 80 recorded utterances; all the confidence
values come from AssemblyAI, not from us.

**At what n:** 80 recordings; of the **59 utterances with confidence 0.95 and above, two
were recognised incorrectly**.

**What that n is not enough for.** Two errors are enough to refute "0.95 means reliable",
and **not enough** to build a calibration curve. So in the interface confidence is shown as
the recogniser's own certainty beside the validator's verdict, not as a quality score in
per cent.

## What we did not measure at all

The full list with the reasons is in [limitations.md](limitations.md). In short: accuracy
on human speech (no open corpus exists), the existence of an NPI in the live registry (our
numbers are synthetic), the optimality of the thresholds (they are chosen values, not
measured optima), the size of the market in money (we did not estimate it and we publish no
figure).
