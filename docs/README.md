# Documentation

Readback is a voice agent that takes prescription orders and proves it did not mishear.
Every field carries provenance: which spoken words produced the value, with millisecond
timecodes, the recogniser confidence over those words, and the verdict of an independent
validator. A value cannot enter the order unless a validator passed it or a human
confirmed it aloud.

The product's hard claim is that **high recogniser confidence does not protect against
homophony**. The model can be certain it heard Bisoprolol while the human said
Lisinopril. Confidence proves nothing there; a regulator-published look-alike
sound-alike list does. So a drug name inside a published ISMP or FDA LASA pair triggers
a mandatory re-ask **even at confidence 1.0**.

This folder is flat and English. Start with whichever question you have.

## What it is and why

| File | Answers |
|---|---|
| [case.md](case.md) | What the product is, who it is for, why read-back is the right procedure, and what the competing approaches get wrong |
| [spec.md](spec.md) | The engineering specification: data model, gate branches, tool schemas, system prompt, metric formulas. Written against a FastAPI/SQLite design that was dropped — the logic holds, the Python does not |
| [slides.md](slides.md) | The presentation, twenty slides, speakable as written |

## What is true, and what is not

| File | Answers |
|---|---|
| [evidence.md](evidence.md) | Every claim the project makes, what it was measured with, at what n, and what that n is **not** enough for |
| [limitations.md](limitations.md) | Everything the project cannot prove, at full strength, nothing softened. Measured, enforced, assumed, or false and admitted |
| [findings.md](findings.md) | Every defect found after the codebase already passed every check it declares. Eight audits, then a cleanup pass; not one came back empty |
| [../eval/REPORT.md](../eval/REPORT.md) | The measurements themselves, each with the command that produced it and the size of the set it came from |

Numbers without a method are forbidden here. Every figure in the report and on the
metrics page carries its command and its set size, and
`tests/scripts/report/honest-report-agreement.test.ts` runs those commands and requires the
printed figures to appear in the report — so a published number cannot go stale
silently.

## The platform and the data

| File | Answers |
|---|---|
| [assemblyai-api.md](assemblyai-api.md) | The AssemblyAI contract **as observed**, not as documented. Where live behaviour contradicts the vendor, the live run wins and this file records it |
| [vercel.md](vercel.md) | What the platform actually allows, verified against current docs rather than memory |
| [domain-data.md](domain-data.md) | The public catalogues — NDC, ISMP, FDA — how each is fetched, filtered and deduplicated, and what each one does not contain |
| [cost-guardrails.md](cost-guardrails.md) | Which commands bill and which do not, what a forgotten socket costs, and how spend is derived from a ledger rather than estimated |

## Running it

```bash
npm run dev     # the Next.js development server
make data       # build the NDC catalogue and the LASA table into data/
make agent      # create the stored agent once, keep the id in the environment
make verify     # everything that must pass before a task counts as done
make help       # every target, grouped
```

`make verify` is the gate for done. Its step list lives in `VERIFY_STEPS` in the
`Makefile` and nowhere else — read it there rather than from any prose, including this
paragraph, because a copy of a list is a copy that drifts.

Every ratchet in that list has a positive control in
`tests/scripts/ratchet-positive-control.test.ts`, which plants a violation and requires
the check to fail. That exists because several of these checks were once green while
checking nothing, which is worse than no check at all: it manufactures confidence.

## A note on this folder

Russian used to live here and no longer does. The repository is English throughout —
names, strings, logs, error codes, commands, documentation — because the domain data
(NDC, ISMP, FDA, Joint Commission) is English and translating clinical terms would
introduce an error class nobody can validate. `make ascii` enforces it.

There are no comments in this codebase, in code or in configuration. When a comment
would have explained something non-obvious, the explanation moves into one of the files
above instead of vanishing.
