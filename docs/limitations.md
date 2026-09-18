# Limitations

Everything this project cannot prove, in one file, at full strength. The short
version lives in [README.md](README.md); this is the complete account with nothing
softened. A limitation discovered by a reader is worth less than one stated by the
author, so it is stated here first.

Each entry carries the same status vocabulary the README uses: what is **measured**,
what is **enforced** by a machine check, what is **assumed**, and what is simply
**false and admitted**.

## The evidentiary chain does not survive a hostile client

**Status: false, and stated as false.**

Provenance is computed in the browser. The browser holds the AssemblyAI streaming
socket directly, so `words[]` with its timings and per-word confidences never passes
through our server; the client posts it to `POST /api/sessions/{id}/turns`, which is
deliberately unauthenticated, because a browser cannot hold the shared tool secret
without publishing it.

Stated at full strength: **anyone with DevTools can post arbitrary words with
arbitrary timings and arbitrary confidences, and the gate will accept a value
carrying that provenance.** The gate verifies that a value traces to words the
session reported. It does not, and cannot, verify that those words were spoken.

Forging your own transcript is lying to yourself, and the gate is not built to stop a
caller who wants to deceive themselves. It is built to stop a recognizer from quietly
mishearing a drug name. In the malicious-client threat model the chain is worth
nothing, and that is the honest sentence.

What the route *does* enforce, because bounds are the only defence available without
a secret: a validated session id (`[A-Za-z0-9._-]`, never `..`, at most 128
characters, so a session id can neither address another tenant's blob nor escape the
`sessions/` prefix); at most 200 words per turn; 400 turns per session; 64 concurrent
sessions, evicted least-recently-used; and word timings bounded by the three-hour
socket cap.

### The alternative, and what it costs

Relaying audio through our own backend is the correct fix, and at least one other
team in this field made exactly that choice for exactly this reason. It is worth
stating their argument in their own words rather than ours: *an untrusted browser
must not be the authority on what was committed.* We agree with the sentence. We did
not follow it, and the reasoning should be judged rather than assumed.

Routing audio server-side means an always-on host. Vercel caps a serverless function
at 300 s on the Hobby tier while these sessions run two to ten minutes, so the relay
cannot be a function; it becomes a process, a second deployment target, and a second
thing that can be down during a demo. The earlier design of this project did proxy
both sockets through a FastAPI backend, and removing the proxy is what removed the
constraint. That is a deployment argument, not a trust argument, and it does not
answer their point.

What it buys, and this is the part that is easy to miss: **granularity survives the
choice we made.** A server-side relay does not automatically give better evidence
than a client-side one. The team that relays audio reports resolution *per clause*,
with character offsets produced by linear interpolation across the clause, because
their speech provider returns no character alignment - their own README says so. Our
provenance is genuine `words[]` with per-word millisecond start and end times and a
per-word confidence, straight from the recognizer, because the browser holds that
socket directly.

So the honest summary is a trade with a named direction, not a concession: we hold
**finer-grained evidence that a hostile client could fabricate**, they hold
**coarser-grained evidence that a hostile client could not**. For the failure this
product exists to catch - a recognizer mishearing a drug name while reporting high
confidence - word-level timings and per-word confidence are the input the gate
actually needs, and a caller forging their own transcript is not the adversary. For
an audit trail that must hold up against the person who created it, their choice is
the right one and ours is not.

Server-side numbers remain honest: `GET /v1/sessions/{id}` returns
`time_to_first_audio_ms` and tool-call timings. It does **not** return word-level
timings, so word-to-gate latency is a browser measurement and is labelled as one
everywhere it appears.

## A caller who corrects themselves inside one utterance is not detected

**Status: measured behaviour, pinned by tests, unfixed.**

If someone says "Lisinopril, no wait, Losartan", the turn contains both words, so the
matcher can prove either one was spoken. Nothing in the system knows the first was
withdrawn. If the agent proposes the retracted value, that value acquires full
provenance and a millisecond timecode: the evidence is real and the conclusion is
wrong.

Four tests in `tests/realtime/self-correction.test.ts` pin this behaviour rather than
leaving it to be found. The mitigation today is the read-back itself, since the value
is spoken back and the caller can reject it. The fix belongs in candidate
construction, not in the gate, which keeps exactly three reasons to re-ask.

## LASA coverage is partial and unquantified

**Status: assumption, not result.**

The ISMP look-alike sound-alike list moved to ECRI and is no longer published at a
stable public URL, so the automated extraction this project was designed around
cannot run. `scripts/build-lasa.ts` falls back to a hand-curated table and records
that fallback as the provenance of the built artefact: `data/lasa-pairs.json` says
`curated table in src/lasa/pairs.ts (20 pairs)`.

**Twenty pairs ship.** An earlier draft of our own documentation claimed about 240
pairs survive matching; that was a design target, never a measurement, and it
survived in our text as though it had been one. The gate's guarantee is about the
pairs it holds, not about every pair ISMP names, and the fraction of the published
list that represents is unknown to us.

If the ECRI list becomes reachable, the parser has a 40-pair floor below which it
refuses to overwrite the curated table, so a partial fetch cannot silently shrink
coverage.

## The evaluation corpus is synthesised

**Status: measured against synthetic speech, and labelled everywhere.**

No open English corpus of human speech reading drug names exists. Entity Error Rate
in [eval/REPORT.md](../eval/REPORT.md) measures the recognizer against synthetic speech,
not human speech. Every figure derived from it inherits that boundary.

Related things we deliberately do not measure:

| Not measured | Reason |
|---|---|
| Accuracy on human speech | No open corpus exists; synthesising is the honest fallback and the limitation travels with the number |
| NPI existence against the live registry | Our NPI numbers are synthetic, generated to satisfy the checksum. The real registry would return "not found" for arithmetically valid numbers and add only noise |
| Threshold optima | Thresholds are initial values reasoned from the cost of an error per field, tuned on the development set. The held-out set measures the result once |
| Keyterms including drug names | Methodologically invalid as a product option: it biases the recognizer toward the exact strings the rules check. If run at all it is a diagnostic that sizes the sacrifice, never an alternative configuration |
| Market size in money | We have not estimated it. A TAM figure we cannot source would contradict the only rule this project is about |

## Thresholds are chosen defaults, not measured optima

**Status: assumption, stated at the head of the report.**

Every threshold in `eval/REPORT.md` is a chosen default. They are reasoned from the
cost of an error in each field, tuned on the development set only, and reported
against a set sealed before development started. Reporting a number obtained on the
tuning set as a generalisation estimate is the specific failure the strongest
competitor in this field honestly admitted to, and it is the one we take most care
not to repeat.

## Our own pre-registered hypothesis failed

**Status: not supported, published anyway.**

We predicted that rare drug names would be measurably harder to recognise than common
ones. The prediction, the decision rule and the falsification condition were written
to `eval/heldout-preregistration.md` **before the audio existed**. The rule required
non-overlapping 95% Wilson intervals between the rare and common strata.

They overlap heavily, and the rare and mid strata are identical at 30.0% each. The
control corpus had suggested 43.8% against 16.7%; that gap did not replicate and on
the evidence was sampling noise in a set of forty.

The negative result stays in the report. Dropping a pre-registered hypothesis that
failed is the practice that makes published benchmarks untrustworthy, and a sealed
set can only be opened once.

What did replicate is the part the product rests on: an overall entity error rate of
26.7% [17.1%, 39.0%] against 27.5% on the control corpus, with four of sixteen errors
sitting at or above the 0.95 threshold, which are errors a confidence check alone
would have written into an order.

## Two of our own guarantees were bypassable

**Status: found by attack, fixed, exploits kept as tests.**

`make gate-invariant` scanned for `as ConfirmedValue` and not for the older
angle-bracket assertion form, so a file could forge a confirmed value while
`biome check`, `npx tsc` and the invariant check were all green simultaneously.
`make secrets` used `grep --exclude-dir=api`, which excludes any directory named
`api` at any depth, so a file at `src/features/api/leak.ts` could read the API key
and pass.

Both are closed, and both fixes were verified by writing the exploit, watching it
pass, applying the fix and watching the same exploit fail. The details are in
[eval/REPORT.md](../eval/REPORT.md).

The general lesson cost us three separate incidents: **absence must never read as
success.** A check that passes when the thing it checks is missing is worse than no
check, because it produces confidence. Every ratchet now has a positive control in
`tests/scripts/ratchet-positive-control.test.ts`.

## Close codes are observations, not specification

**Status: observed; the vendor documents none.**

Verified 17 September 2026 against the streaming API reference: AssemblyAI documents
**no WebSocket close codes at all**. Every entry in `src/realtime/close-codes.ts` is
therefore an observation, and each records whose. We measured 1000 and 1008
ourselves, where 1008 is what the rate limiter actually sends and we have never once
observed the 3009 that the documented condition is supposed to produce. 3006 comes
from another team's measurement. 3007, 3008 and 3009 come from vendor prose rather
than from a close-code table.

None of them may be presented to a reviewer as specification.

## Voice audio leaves this application and goes to a third-party vendor

**Status: disclosed, not independently verified.**

Both AssemblyAI sockets are held directly by the browser, so the caller's voice is
streamed to `wss://streaming.assemblyai.com` and `wss://agents.assemblyai.com` — the
global endpoints, with no explicit data-residency selection in this codebase.
AssemblyAI separately publishes region-pinned endpoints
(`streaming.us.assemblyai.com`, `streaming.eu.assemblyai.com`, and a `.eu.` LLM
Gateway host), which this project does not use and has not evaluated for this
purpose.

What AssemblyAI retains from a session, for how long, and under what policy is
governed by AssemblyAI's own terms and privacy policy, not by this repository. We
have not read those documents closely enough to summarise their retention terms here,
and a summary we had not verified would be exactly the kind of unsourced figure this
project refuses to publish elsewhere. The honest statement is the absence of one: a
caller's voice is sent to AssemblyAI, consent to that is implied by using the
application at all, and no separate consent screen names the vendor or link to its
policy before a session starts. All data used in this project's own demonstrations
and evaluation runs is synthetic, generated by a desktop speech synthesiser — see
*The evaluation corpus is synthesised*, above — so this limitation concerns real use
of the application, not anything published in `eval/REPORT.md`.

## In a real emergency, do not use this application

**Status: disclaimer, with an action rather than only a refusal.**

The existing disclaimer states what this project is not; it does not yet tell a
caller what to do if they are in the situation the product's own domain implies. If
this were a real prescription intake and something is wrong right now — an allergic
reaction, a medication error already taken, any symptom that feels like an emergency —
**call 911, or 988 for a mental health crisis, immediately.** This application does
not call emergency services, does not triage symptoms, and nothing in its design
routes an emergency to a human faster than a phone would. `DISCLAIMER_BODY` and
`DISCLAIMER_AFFILIATION` in `src/shared/ui/states/disclaimer/index.tsx` are the
existing, code-owned wording; this paragraph is the one addition this file proposes
for that component, stated here because the wording change itself belongs to Agent B.

## This is not a medical device

A technology demonstration. All data is synthetic: no real patients, no real
prescriptions, no clinical use, no claim of regulatory approval or review.

This project quotes ISMP, the FDA, the Joint Commission and 21 CFR. It is **not
affiliated with, endorsed by, or reviewed by any of them.** The citations establish
that read-back is an existing requirement; they establish nothing about this
software.

Do not enter real patient data into this application.

## The regulatory citations, and what we have not sourced about them

**Status: cited by clause number, without a penalty figure we have not verified.**

Three citations recur through this project, each with the clause that requires
read-back rather than a paraphrase of one:

- **ICAO Annex 11, §3.7.3** — requires a receiving station to repeat a received
  message back to the transmitting station to obtain confirmation of correct
  reception. It governs flight crews, not prescription intake; we cite it because
  medicine's own read-back requirement is documented as borrowed from aviation
  practice, not because this project is subject to it.
- **Joint Commission National Patient Safety Goals, in force since 2003** — requires
  verifying a complete verbal or telephone order, or a critical test result, by having
  the receiver read the complete order back. This is the clause that applies most
  directly to the domain this project simulates.
- **21 CFR 1306.12(a)** — prohibits refilling a Schedule II prescription outright.
  `eval/REPORT.md` documents a case where the gate would have confirmed exactly that
  refusal-worthy order before this rule was wired into `src/gate/`.

**What we do not publish here: a penalty or sanction figure attached to any of the
three.** We have not located a sourced, current civil-penalty or licensure-sanction
number for a Joint Commission NPSG lapse or a 21 CFR 1306.12(a) violation that we can
verify against a primary source rather than a secondhand summary, and this project's
own rule against unsourced figures applies to us here more than anywhere: a
frightening-sounding penalty number would be the single easiest thing in this section
to write without checking. If a reader needs the current civil-penalty schedule or
enforcement record for either clause, that belongs to the regulator's own published
material, not to a number invented for this document.
