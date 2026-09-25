# Project: Readback — voice prescription intake that proves it did not mishear

The case document: why this problem, why this domain, and what the product does about it.
It rests on [domain-data.md](domain-data.md) for the verified data sources and
[assemblyai-api.md](assemblyai-api.md) for the protocol as observed.

The engineering specification is [spec.md](spec.md): the thresholds and why they are what
they are, the gate's branch order, the tool contracts, the system prompt and the exact
metric formulas.

## Why the name Readback

The name is not a metaphor. It is **the exact term for the safety procedure the product automates** — and it is a ready-made line for the pitch.

**Aviation, ICAO Annex 11 §3.7.3.1:**

> The flight crew shall read back to the air traffic controller safety-related parts of ATC clearances and instructions which are transmitted by voice.

The general definition of a read-back, often quoted under this section, sits elsewhere (SKYbrary attributes it to Annex 10 Volume II); §3.7.3.1 is the requirement itself.

**Clinical, Joint Commission, a National Patient Safety Goal introduced in 2003** (NPSG.02.01.01, 2009 wording):

> For verbal or telephone orders or for telephone reporting of critical test results, the individual giving the order or test result verifies the complete order or test result by having the person receiving the information record and "read back" the complete order or test result.

ISMP's 2017 survey places the requirement in the standards at PC.02.01.03 EP 20. Its location in the 2026 manual, after the goals were restructured, is not verified by us.

Medicine borrowed the readback/hearback pair straight from aviation; AHRQ TeamSTEPPS calls the same pattern check-back (closed-loop communication). So we are automating a step that regulation requires and practice skips — recorded by [ISMP](https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf) ("Despite technology, verbal orders persist, read back not widespread").

A side effect that matters for how the product reads: it slots into an existing safety protocol rather than inventing a new one. That is the defence against being read as "another AI toy".

Written as one word — **Readback**, not ReadBack: that keeps distance from ReadBack Medical Imaging (a live company in radiology/PACS — a different segment, but the spelling coincides). `github.com/readback` is free. The full breakdown of candidates and collisions lived in the naming reference, which has since been removed.

---

## 1. One sentence

A voice agent for prescription intake that, for every extracted field, presents the source words with timecodes, the recogniser's confidence and the result of an independent check — and physically cannot write a value that failed its validator or was never confirmed aloud.

## 2. The problem

AssemblyAI states it themselves, in an article dated 8 September 2026:

> A conversation isn't one transcription. It's a chain of them.

([The Voice Agent Accuracy Problem Nobody Benchmarks](https://www.assemblyai.com/blog/voice-agent-accuracy-problem-benchmarks).)

In prescription intake that is not an abstraction. Their own example: "A patient states an allergy to Lisinopril. The transcript reads Bisoprolol." — drugs of different classes, both real, both plausible in context. There is no error signal. The LLM confidently files an order for the wrong medication. That particular pair, checked on 25 September 2026, is on no published LASA list we could find, so our pair rule would not catch it and only the read-back would; the demo therefore uses a pair the ISMP list does carry, hydromorphone and morphine, which ISMP's 2017 survey of verbal orders also reports being misheard between people.

The figures that set the scale, all AssemblyAI's own (sources with exact wording in [sources.md](sources.md)):

| Fact | Value |
|---|---|
| Entity Error Rate for Universal-3.5 Pro Realtime | 15.31% at WER 6.99% |
| Entity errors in the benchmark's names category | 16.92% |
| Success of a five-turn scenario at 84.69% capture accuracy per turn | **43.6%** |
| The same, if every entity is read back and the caller catches 70% of errors | **79.1%**, a projection |

The last row is the vendor's projection, not a measurement, and it rests on the caller catching seven errors in ten when a value is read back. A caller who answers "yes" to "morphine, correct?" out of habit is how that assumption fails; the contrastive read-back for published pairs exists to stop it.

## 3. Why pharmacy specifically

Of the five domains worked through ([domain-data.md](domain-data.md)), pharmacy wins for one reason nobody else has:

**The regulator has already published an adversarial set.** Lists of confusable names exist precisely because the confusion kills people:

| Set | What is inside | Status |
|---|---|---|
| [ISMP List of Confused Drug Names (2023)](https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf) | Ready-made look-alike/sound-alike (LASA) pairs | downloaded, 632 KB |
| [ISMP Error-Prone Abbreviations (2024-04)](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf) | Dangerous sig codes: `qd` against `qid`, `U` against `0`, `MSO4` against `MgSO4` | downloaded, 330 KB |
| [FDA Name Differentiation Project](https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project) | 23 official pairs with tall-man spelling (vinBLAStine / vinCRIStine, CISplatin / CARBOplatin) | 23 pairs read |

That removes the main vulnerability of any hackathon metric — "and why is your test set representative?". The answer: the set was not assembled by me, it was assembled by ISMP, and every pair has a documented clinical harm.

**A dictionary for keyterms — no registration.** [FDA NDC Directory](https://www.accessdata.fda.gov/cder/ndctext.zip), 10.8 MB zip → 70 MB TSV, **116,155 products** (verified: downloaded, unpacked, counted). Public domain. Plus the [openFDA NDC API](https://api.fda.gov/drug/ndc.json) with no key — 137,830 records.

**AssemblyAI has a parameter dedicated to this domain.** In Streaming STT: `domain: medical-v1`. AssemblyAI states that medical mode and prompting reduce errors on medical terms; we have not recorded the source of their figure and do not quote it. So we have something to switch on, and something to measure by switching it on.

**Three independent hard validators** (all checked by hand in [domain-data.md](domain-data.md)):

| Entity | Validator | Check |
|---|---|---|
| DEA number | 2 letters + 7 digits, `(d1+d3+d5) + 2×(d2+d4+d6)`, last digit = 7th | `AB1234563` → 33 → 3 = 3 ✓; `BX1234567` rejected |
| NPI | 10 digits, Luhn with the mandatory `80840` prefix | `1234567893` → sum 67 → 3 ✓; `1234567890` rejected |
| NDC | No check digit — the 5-4-2 format plus existence in a 116,155-row catalogue | format rules from the [FDA](https://www.fda.gov/drugs/electronic-drug-registration-and-listing-system-edrls/national-drug-code-format) |

The honest downside, which we must name in the README ourselves rather than wait to be asked: **NDC has no check digit.** DEA and NPI are provable by arithmetic; the drug name and the strength are checked against the catalogue and for internal consistency (the drug × strength × form × route combination must exist in `product.txt`).

**No PII is needed at all.** Drug names, strengths, forms and sig codes are not personal data. DEA and NPI numbers are generated synthetically from their checksums. The patient name in the scenario is fictitious. That removes both the legal risk and the question "where did you get real prescriptions?".

---

## 4. What actually happens in the product

### The scenario

A physician or nurse calls from a clinic and dictates a prescription order to a pharmacy. The agent carries the conversation and assembles a structured record in parallel:

```
Drug:          Hydromorphone
Strength:      2 mg/mL
Form:          injection, intravenous
Quantity:      30
Sig:           1 mg intravenously every 4 hours as needed
Prescriber:    NPI 1245319599
DEA (if CS):   AB1234563 (hydromorphone is Schedule II)
Patient:       Jane Doe (fictitious)
```

### The key moment: what a field looks like in the UI

Every field is not merely a value but a record with provenance:

| Element | Where it comes from | What it is for |
|---|---|---|
| Value | extraction from the transcript | the data itself |
| Source words + timecodes | `words[]` from `Turn`, the `start`/`end` fields in ms | clicking the field highlights exactly those words and plays the fragment |
| Confidence | `confidence` on the source words, minimum over the span | the numeric threshold for a re-ask |
| Validator status | local check (DEA mod-10, NPI Luhn, catalogue lookup) | an objective "does not add up" |
| Confirmation status | `unconfirmed` / `read_back_pending` / `confirmed_by_voice` | it is visible what was confirmed aloud |
| LASA risk | membership in a pair on the 2023 ISMP list | "morphine and hydromorphone are on a published confused-drug-names list. Which: morphine, M-O-R, or hydromorphone, H-Y-D? Answer with a name." |

### Three reasons the agent is obliged to re-ask

This is not a prompt, it is code. The function that writes into the order accepts only a `ConfirmedValue` object, which cannot be constructed around the checks:

1. **Low confidence.** The minimum `confidence` over the source words is below the field's threshold (the drug name's threshold is higher than the quantity's).
2. **Validator failure.** DEA/NPI does not add up against its checksum; NDC is the wrong format; the drug × strength × form combination is not in the catalogue.
3. **Confusion risk.** The recognised name is on the 2023 ISMP List of Confused Drug Names — then the re-ask is mandatory regardless of confidence, and it is contrastive: the agent names the heard drug and every drug the list pairs with it, and only a spoken name answers it. A "yes" confirms nothing, and naming a partner corrects the value.

The third point is the most interesting place in the product. High recogniser confidence here **does not mean** being right: the model can be certain of "morphine" because it heard it clearly, while the human said "hydromorphone". Confidence does not protect against homophony; a regulator's list does.

### A critical subtlety: keyterms must not be fed the same words the rules look for

The insight came from reviewing how other voice agents in this field configure the recogniser, and it applies directly here. If you feed both names of a LASA pair into `keyterms_prompt`, the recogniser starts latching onto them, and the observation stops being independent of the check: we get confirmation of the very hint we supplied.

So the dictionaries are split:

- **Keyterms do get** identifying context: the clinic name, the physician's name, the dosage form names, the units of measurement.
- **Keyterms do NOT get** a single drug name from the LASA pairs under check.

And a test is written for this, which fails if someone adds a checked term to the biasing dictionary. That is also a ready-made substantive finding for the "what we learned about the API" section.

---

## 5. Architecture

Stack: **one Next.js application on Vercel, TypeScript throughout**. No Docker, no
always-on process, no database server of our own: finished sessions go to Vercel Blob, and
the shared daily budget and session registry to Upstash Redis from the Vercel Marketplace.

### Why a hybrid rather than the Voice Agent API alone

AssemblyAI writes it themselves: a cascaded pipeline can be debugged, whereas an
audio-in/audio-out black box gives no way to see a recognition error. We need `words[]`
with timecodes and confidence, so Streaming STT is mandatory. The conversational loop with
turn detection and barge-in is cheaper taken ready-made from the Voice Agent API.

The hybrid is what the gate needs: without `words[]` there is nothing for it to check.

### Why the browser holds both sockets

An earlier design proxied both sockets through a FastAPI backend. That forced an
always-on host, and it collided with the platform: Vercel caps a function at 300 s on
Hobby while a session runs two to ten minutes. Removing the proxy removed the constraint,
and the diagram below is what replaced it.

```
                  ┌──────────────── browser ────────────────┐
  microphone ─→ AudioWorklet (PCM16)                        │
                  │                                         │
                  ├──→ wss://streaming.assemblyai.com/v3/ws │
                  └──→ wss://agents.assemblyai.com/v1/ws    │
                  │                                         │
                  │      transcript + field cards           │
                  │      (value, source words, confidence,  │
                  │       validator verdict, gate decision) │
                  └─────────────────┬───────────────────────┘
                                    │ HTTPS, short requests only
                  ┌─────────────────▼───────────────────────┐
                  │        Next.js routes on Vercel         │
                  ├─ GET  /api/tokens/stt    short-lived token
                  ├─ GET  /api/tokens/agent  short-lived token
                  ├─ POST /api/tools/*       webhooks AssemblyAI calls
                  └─ POST /api/sessions/*    finalise and read back
                                    │
                  ┌─────────────────▼───────────────────────┐
                  │  gate, validators, lasa, catalog        │
                  │  ConfirmedValue or a re-ask             │
                  └─────────────────┬───────────────────────┘
                                    │
                            Vercel Blob: finished sessions
```

The consequence is stated rather than hidden: `words[]` never passes through our server,
so provenance is client-supplied data. [limitations.md](limitations.md) carries that in
full, and the tools run server-side precisely because a browser cannot hold the shared
secret they authenticate with.

### Two sockets, one microphone stream

The same PCM goes to two places, but with different jobs and different formats:

| | Streaming STT | Voice Agent API |
|---|---|---|
| Endpoint | `wss://streaming.assemblyai.com/v3/ws` | `wss://agents.assemblyai.com/v1/ws` |
| Authorisation | `Authorization: <key>` **without Bearer** | `Authorization: Bearer <key>` |
| Audio | binary frames, PCM16 **16 kHz** | base64 inside a JSON `input.audio`, PCM16 **24 kHz** |
| What for | `words[]`, `start`/`end`, `confidence`, `speaker_labels` | conversation, turn detection, barge-in, tool calling |

The different authorisation formats and the different sample rates are a documented trap from [assemblyai-api.md](assemblyai-api.md). It is easy to lose an hour on it.

### Streaming STT configuration

```
speech_model=universal-3-5-pro
domain=medical-v1
mode=balanced
format_turns=true
keyterms_prompt=[...identity terms only, no LASA names...]
prompt=<domain context, up to 1750 characters>
session_heartbeat=true
```

`domain=medical-v1` and `prompt` are the domain context that AssemblyAI states reduces errors on medical terms; we have not recorded the source of their figure and do not quote it. We switch them on not because we can, but because it is a measurable delta: a run with them and a run without them is a ready-made experiment.

### Tool calling: the critical pattern

From [assemblyai-api.md](assemblyai-api.md), this is what breaks most often:

```python
if event["type"] == "tool.call":
    result = run_tool(event["name"], event["arguments"])
    pending.append({"call_id": event["call_id"], "result": json.dumps(result)})

if event["type"] == "reply.done":
    if event["status"] == "completed":
        for item in pending:
            send({"type": "tool.result", **item})
    pending.clear()
```

The asymmetry between `arguments` (an object) and `result` (a string) is real and not obvious. The LLM Gateway model has to be picked from those capable of tool calling: `gemini-2.5-flash`, `gpt-5-mini`, `claude-haiku-4-5`. The default in the documentation's examples, `qwen3.5-4b-32k-fast`, **cannot** do tool calling, per the capabilities table in [assemblyai-api.md](assemblyai-api.md), which is a trap worth a line in the README.

The agent's tools:

| Tool | What it does | `execution_mode` |
|---|---|---|
| `lookup_drug` | looks the drug up in the NDC catalogue, returns the available strength × form × route | `interactive` |
| `validate_prescriber` | checks the NPI (Luhn+80840) and the DEA (mod-10) | `interactive` |
| `propose_field` | proposes a field value with its word span and confidence — **does not write** | `interactive` |
| `commit_order` | writes the order; **refuses** if any critical field is not `confirmed` | `hold` |

`commit_order` in `hold` mode — the agent holds its pause while the write happens and does not talk over it. And its refusal on an unconfirmed field is exactly the gate, visible to a judge live.

---

## 6. What we measure and how

Few submissions in this field publish a measured number together with its command and set size; this section is where the project differs.

### Metrics

This table is the plan as written. The Status column says what was run; `eval/REPORT.md`
holds every figure that exists.

| Metric | Method | AssemblyAI's benchmark | Status |
|---|---|---|---|
| **Entity Error Rate** | on the held-out set, scored against the known ground truth | their reference 15.31% | measured, `make eval-heldout` |
| EER with `domain=medical-v1` and `prompt` against without them | A/B on the same audio | they state a reduction; figure not quoted | planned, not run |
| **Turn-to-turn latency** | from end of speech to the first byte of sound, N ≥ 30 | P95 < 1500 ms | not measured |
| Finalization delay | from the `Turn` messages | P95 < 500 ms | measured on live STT sockets, `make eval-control` |
| **Caller repeat rate** | consecutive repetitions of a phrase, segmented by the agent's preceding question | their example: 19% on email, 1% on yes/no | planned, not run |
| **What a reflex yes writes: pair rule on / off** | the same candidates and the same read-back, one flag apart (`make ab-gate`) | their 43.6% → 79.1% assumes the caller catches 70% of read-back errors; this measures the caller who catches none | measured offline, constructed mishearings |
| Share of errors caught by a validator against those caught by a re-ask | breakdown | — | measured, `make coverage-matrix` |
| Cost per completed order | not $/hour | their formulation | planned, not run |

### How to make the proof honest

**Held-out.** The set is labelled in the first two days and is not used for tuning even once before the final evaluation. A figure measured on the set the thresholds were tuned on is a regression suite, not a generalisation estimate; a figure from a sealed held-out set is stronger in meaning even when it is numerically worse.

**Corpus.** On AssemblyAI's recommendation — 50 worst cases: telephone quality (8 kHz mulaw, `encoding=pcm_mulaw`), background noise, accents, interruptions, false starts. What was built: clean desktop TTS at 22 kHz and 16 kHz, and a stress set that passes every listed name through a telephone band, white noise and a speed-up (`eval/stress`). Not built: accents, interruptions, false starts, or any human voice.

**Synthesis without PII.** DEA and NPI numbers are generated from their checksums; drugs and strengths come from the NDC catalogue; patient names are fictitious. Ground truth for every file is known by construction — so EER is computed without contestable manual labelling on the fields that have a validator.

### Observability as a product feature

A dedicated `/metrics` page in the application, not a section in the README. The list below is what it was planned to hold; what is measured shows its figure and command, and the rest shows a dash:

- P50/P95/P99 by latency component
- entity capture rate by field type
- caller repeat rate broken down by the agent's question
- WebSocket close codes: **3007** (malformed chunks), **3008** (the three-hour cap, a billing leak), **3009** (session limit) — logged from the Error frame, not from the truncated reason
- session cost

Every number on the page carries the command that produced it. Not one figure without a method.

---

## 7. The demo for a judge

The judge is alone, time is short, and there may be no microphone. Hence three modes:

**Mode 1 — live conversation.** A microphone, a real dialogue, field cards visible with confidence and word highlighting.

**Mode 2 — judge-solo (mandatory).** A synthesised session replays through the shipped gate instead of a microphone, the full path to a finished order. Works without microphone permission and without a second person.

**Mode 3 — "catch the error".** The most convincing one. A synthesised session stages "hydromorphone" heard as "morphine" at confidence 1.0; no recognizer run has produced that error. On screen: the agent names both drugs from the ISMP list and asks which; a "yes" files nothing, and the name the caller says is what goes into the order. Beside it, the same session with only the pair rule switched off: the drug is read back plainly, the caller says "yes" by reflex, and the order goes out with the wrong drug.

That is 40 seconds which explain the whole product without words.

### Video script (2 minutes)

| Time | What is shown |
|---|---|
| 0:00–0:15 | The problem: the hydromorphone → morphine example, the figure 43.6% |
| 0:15–0:50 | Live conversation: dictating the order, field cards filling in, confidence visible |
| 0:50–1:20 | "Catch the error" mode: the gate stops the wrong drug, the agent re-asks |
| 1:20–1:40 | Click on a field → the source words highlight and the fragment plays |
| 1:40–2:00 | The `/metrics` page: P95, EER on the held-out set, the gate A/B, with a timer on screen |

The on-screen timer is mandatory: latency has to be shown, not claimed.

---

## 8. Repository structure

An earlier version of this document drew the tree here, against a `backend/` of FastAPI
modules, `.py` validators and SQLite. **None of that exists.** The design was dropped for
one Next.js application on Vercel, and the drawing survived the design it described for
long enough to be a good argument against drawing it at all: a structure copied into prose
is a structure that drifts, silently, while reading as authoritative.

The layout and the layer rules live in `CLAUDE.md`, beside the rules that constrain them,
and `make import-cycles` enforces the one that matters — the gate is a leaf of the import
graph.

## 9. Schedule

Deleted along with the architecture it assumed. It scheduled FastAPI skeleton work and a
deployment to an always-on host, both of which the project no longer does.

## 10. Where the idea is not new, and where it is

The gate idea is not ours. Several submissions in this field put deterministic code
between the model and the record, and some did it earlier. The provability niche is
the most crowded one at this hackathon, and we say so before a judge has to.

What is genuinely different here:

1. **A regulator-published sound-alike list overrides confidence 1.0 for a value that
   is valid in the catalogue.** The gates we found fire on low confidence, on a failed
   validator, or on a value missing from a known set. A confident, valid, wrong drug
   name passes all three; it does not pass ours.
2. **The same list is the adversarial corpus.** Both directions of the 20 curated pairs
   as they stood on 16 September are in the development set, rather than tests invented
   by the team; eight pairs were replaced on 25 September and are not in it.
3. **A held-out set, sealed since day 2**, so the published figure is a generalisation
   estimate and not a regression suite.

This belongs in the pitch as an admission: "the gate idea is not new, this is what is
new" reads as maturity, not as weakness.

---

## 11. Risks and what to do

| Risk | Likelihood | Response |
|---|---|---|
| `domain=medical-v1` gives a smaller delta than AssemblyAI states | medium | We publish the measurement as it is. A negative result with a method is stronger than somebody else's figure with no check. That is exactly the material for the "what we learned about the API" section |
| The LASA pairs are recognised too well and the gate never fires | medium | The corpus is degraded on purpose: 8 kHz mulaw, noise, fast speech. AssemblyAI writes themselves that the degradation comes from real audio, not from the model |
| Not enough time for everything | high | Order of cuts: first judge modes 2 and 3, then `/metrics`, then UI polish. The gate and the measurements are not to be cut |
| The judge opens the demo while the backend is down | medium | There is no backend to go down: the judge path replays a synthesised session through the real gate without a key or a microphone, and `/api/health` reports status honestly |
| Medical liability in the pitch | low | An explicit disclaimer: a technology demonstration, not a medical device, synthetic data |
| NDC regulation changes | low | [The FDA proposes a single NDC format](https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements) — mention it as context awareness |

---

## 12. What to say in one paragraph at the pitch

In prescription intake a recognition error does not look like an error: "hydromorphone" becomes "morphine", both drugs exist, the LLM confidently files the order, and there is no signal. By AssemblyAI's figures, at an entity capture accuracy of 84.69% per turn a five-turn scenario reaches the end in 43.6% of cases; AssemblyAI projects 79.1% if every entity is read back and the caller catches 70% of the errors, a model rather than a measurement. Readback implements that confirmation as an architectural constraint: a value does not enter the order if the checksum did not add up, if the confidence is below the threshold, or if the name is part of the published ISMP list of confused drugs. Every field shows the source words with timecodes and the recogniser's confidence, and the metrics page shows each figure with its command, and a dash where nothing was measured.
