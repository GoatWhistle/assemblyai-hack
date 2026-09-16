# Evaluation report

Every figure in this file carries the command that produced it and the size of the set
it came from. A number without both is not published here. A row that has not been
measured says so; it does not carry a plausible placeholder.

**Status: no measurement has been run yet.** The tables below are the shape of the
report, with the method fixed in advance so the result cannot be chosen after seeing
it.

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

| Set | N | EER | WER | Command |
|---|---|---|---|---|
| development | not measured | — | — | `make eval SET=eval/dev` |
| held-out | not measured | — | — | `make eval` |

**Stated limitation, not a footnote:** the corpus is synthesised. No open English
corpus of human speech reading drug names exists, so this measures the recognizer
against synthetic speech, not against human speech. The figure is an indicator of
relative difficulty, not a clinical accuracy claim.

## Latency

Measured in the browser for word-level timings, and server-side where the API reports
it. The two are labelled separately because they are not the same claim.

| Metric | N | P50 | P95 | P99 | Source | Command |
|---|---|---|---|---|---|---|
| turn to turn | not measured | — | — | — | browser | `make measure` |
| word to gate decision | not measured | — | — | — | browser | `make measure` |
| time to first audio | not measured | — | — | — | `GET /v1/sessions/{id}` | `make measure` |
| finalization delay | not measured | — | — | — | server | `make measure` |

Word-level timings do not exist in the server-side session record, so word-to-gate
latency is a browser measurement and is labelled as one rather than presented as
server-verified.

## Gate effectiveness

The two sides of the same mechanism. Publishing only the first would make the metric
one-sided.

| Metric | N | Value | Command |
|---|---|---|---|
| wrong values caught, gate on | not measured | — | `make ab-gate` |
| wrong values accepted, gate off | not measured | — | `make ab-gate` |
| **false-ask rate** | not measured | — | `make ab-gate` |
| caller repeat rate | not measured | — | `make measure` |

**False-ask rate is the cost of the idea** — how often the gate asked when the value
was already correct. It is the only answer to the obvious question of whether the
agent re-asks constantly, and it is reported next to the catches, not beneath them.

## LASA coverage

| Figure | Value | Command |
|---|---|---|
| pairs extracted from the ISMP list | not measured | `make data` |
| pairs surviving the catalogue match | not measured | `make data` |
| naive match rate, no salt stripping | not measured | `make data` |
| match rate with salt stripping | not measured | `make data` |

## Socket close codes

Counted over every run, because a close code explains a result that otherwise looks
like a latency outlier.

| Code | Meaning | Count |
|---|---|---|
| 1000 | normal | not measured |
| 3007 | malformed audio chunks | not measured |
| 3008 | three-hour cap reached | not measured |
| 3009 | session limit exceeded | not measured |

## What is not measured, and why

| Not measured | Reason |
|---|---|
| Accuracy on human speech | No open English corpus of drug-name speech exists. Synthesising it is the honest fallback, and the limitation is stated wherever the number appears. |
| NPI existence against the live registry | Our NPI numbers are synthetic, generated to satisfy the checksum. Querying the real registry would return "not found" for arithmetically valid numbers and would only add noise. |
| Threshold optima | Thresholds are initial values reasoned from the cost of an error per field. Tuning happens on the development set; the held-out set measures the result once. |
| Keyterms with drug names included | Methodologically invalid as a product option, since it biases the recognizer toward the exact strings the rules look for. If run at all, it is a diagnostic that sizes the sacrifice, never an alternative configuration. |
