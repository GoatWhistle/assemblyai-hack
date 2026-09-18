# Pre-registration: the rarity hypothesis on the held-out set

Written **before** the held-out set was opened or synthesised, and committed before any
audio existed. Everything below is fixed at the moment of writing. If the measured
result contradicts it, the contradiction is published and this file is not edited.

## Where the hypothesis came from

The control corpus (`eval/control`, 40 utterances, `make eval-control`) suggested that
the entity error rate depends on how established a drug is, stratified by the number of
distinct `(strength, form, route)` combinations the FDA NDC build holds for its name:

| Stratum | N | Errors | EER, 95% Wilson |
|---|---|---|---|
| at most one combination | 16 | 7 | 43.8% [23.1%, 66.8%] |
| more than one combination | 24 | 4 | 16.7% [6.7%, 35.9%] |

**The intervals overlap, so nothing is demonstrated.** That is the whole reason this
set exists. Reporting 43.8% against 16.7% as a finding would be reporting a difference
our own intervals do not support.

The stratifier comes from the public catalogue build rather than from any transcription
result, so it cannot have been fitted to the errors it is being tested against.

## The set

`eval/heldout/terms.json`, built 2026-09-16, sealed the same day, digest recorded in
`eval/heldout.sha256` and enforced by `make heldout-seal` inside `make verify`.

- 60 single-word generic names from the built NDC catalogue, 6 to 16 letters.
- Three strata of exactly 20: `rare` (at most one combination), `mid` (two to four),
  `common` (five or more). Pools before drawing: 384, 430, 262 of 1076 eligible names.
- Seed 41, fixed.
- **Every LASA pair term and every control-corpus term excluded**, so this set shares no
  item with anything already measured and cannot be contaminated by tuning.

## The prediction

**H1.** Entity error rate falls monotonically from `rare` to `mid` to `common`.

**H0.** It does not; the apparent effect on the control corpus was sampling noise.

## The decision rule, fixed now

1. **The effect is demonstrated** only if the 95% Wilson interval for `rare` does not
   overlap the interval for `common`. Twenty per stratum is a small sample and we say so
   in advance: non-overlap at n=20 requires a large effect, and an overlap will be
   reported as "not demonstrated", never as "trending".
2. **Monotonicity is reported separately from significance.** Three point estimates in
   the predicted order with overlapping intervals is one sentence of evidence, not a
   result.
3. **Any run containing a socket close code other than 1000 is discarded and re-run**,
   spaced at least 24 seconds apart. Close code 1008 is the free-tier rate limit and
   has already produced one fabricated 52.5% figure in this project; a run containing
   it measures the limiter, not the recognizer.
4. **The set is opened exactly once.** No re-draw, no re-stratification after seeing the
   result, no dropping of a stratum. If the measurement fails technically, the same 60
   terms are re-run unchanged.
5. **Name length is checked as a confound** and published whether or not it explains
   anything, because it is the obvious alternative account of the same effect.

## What would falsify H1

`common` showing an error rate at or above `rare`. That outcome would mean the control
corpus result was noise, and the honest consequence is that the rarity stratification
leaves the report as a negative result — which costs us a finding and keeps the report
true.

## What this cannot show

Held-out discipline supports a generalisation claim about **this recognizer on
synthetic speech from this catalogue**. It says nothing about human speech, which no
open English corpus of drug names exists to measure, and nothing about clinical
outcomes.
