# Readback documentation

> Readback is a voice agent that takes prescription orders and proves it did not mishear:
> a value enters the order only when a validator proved it or the caller confirmed it aloud,
> and a drug name on the published ISMP list of confused names is asked again even at
> recognizer confidence 1.00. These pages explain what the product does, how it is built,
> how each claim is known, and what it cannot prove.

**Start here if** you are judging the submission: [for judges](for-judges.md) is a two-minute
route through the live product, and every page below is one link from it.

---

## What is it, and why does it matter?

| Page | What it answers |
|---|---|
| [For judges](for-judges.md) | Every route of the deployment, a two-minute walk-through, the attack console, what to try with a microphone, and where each judging criterion is answered |
| [Product](product.md) | The problem, why pharmacy, what happens in a call, what has and has not been shown, who would pay, what is new, the risks |

## How is it built?

| Page | What it answers |
|---|---|
| [Architecture](architecture.md) | What talks to what, why the browser holds both sockets, one field from speech to a written value, audio, turn detection, per-session agents, running locally |
| [Specification](specification.md) | The data model, the field policy and thresholds, the gate's branch order, every tool contract, the prompt, keyterms, metric definitions, the held-out seal |
| [Design decisions](design-decisions.md) | Rules no other page states, each with the failure it prevents, the test that enforces it, and its residual limit |
| [Reference data](reference-data.md) | How the FDA NDC catalogue and the ISMP list are built into `data/`, what the DEA and NPI checksums prove, and sources not used |
| [Security](security.md) | Trust boundaries, the key, the shared spend ceiling, tool authentication, client-supplied provenance and the vendor witness, headers, fail-closed storage, where audio goes |

## How is each claim known?

| Page | What it answers |
|---|---|
| [Evidence](evidence.md) | Every claim graded from measured to false, with the command and set size behind each measured one and what that set cannot show |
| [Evaluation report](../eval/REPORT.md) | Every measured figure beside its command, set size and interval: recognizer errors, what the gate asks and catches, checksums, latency, live runs, spend |
| [Verification](verification.md) | What `make verify` and CI run, gate mutation testing, positive controls, figures reproduced offline by `make honest`, which commands bill, the live smoke harness |
| [Human voice set](../eval/live/voice-set.md) | The recording script for the first human-spoken evaluation set and what each line tests; no recording exists yet |
| [Sources](sources.md) | Every outside rule and figure, quoted verbatim with its link, including the evidence that cuts against the product |

## What can it not prove, and what does it cost?

| Page | What it answers |
|---|---|
| [Limitations](limitations.md) | Everything the project cannot prove, at full strength: a hostile client, synthesised evidence, list coverage, chosen thresholds, open security gaps, regulatory status |
| [Cost and budget](cost-and-budget.md) | The vendor's rates, what caps the spend, which commands bill, what a forgotten tab costs, and how spend is reported from the ledger |

`docs/brand/` holds the wordmark shown in the project README, and `docs/images/` the
screenshots of the deployment, taken at 1440 by 900.

---

<p align="center"><sub><a href="../README.md">Project README</a></sub></p>