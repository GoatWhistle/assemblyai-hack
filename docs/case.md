# Project: Readback — voice prescription intake that proves it did not mishear

The case document: why this problem, why this domain, and what the product does about it.
It rests on [domain-data.md](domain-data.md) for the verified data sources and
[assemblyai-api.md](assemblyai-api.md) for the protocol as observed.

The engineering specification is [spec.md](spec.md): the thresholds and why they are what
they are, the gate's branch order, the tool contracts, the system prompt and the exact
metric formulas.

## Why the name Readback

The name is not a metaphor. It is **the exact term for the safety procedure the product automates** — and it is a ready-made line for the pitch.

**Aviation, ICAO Annex 11 §3.7.3:**

> A readback is a procedure whereby the receiving station repeats a received message or an appropriate part thereof back to the transmitting station so as to obtain confirmation of correct reception.

**Clinical, Joint Commission National Patient Safety Goals, requirement introduced in 2003:**

> For verbal or telephone orders or for telephonic reporting of critical test results, verify the complete order or test result by having the person receiving the order or test result read-back the complete order or test result.

Medicine borrowed the readback/hearback pair straight from aviation; AHRQ TeamSTEPPS calls the same pattern check-back (closed-loop communication). So we are automating a step that regulation requires and practice skips — recorded by [ISMP](https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf) ("Despite technology, verbal orders persist, read back not widespread").

A side effect that matters for how the product reads: it slots into an existing safety protocol rather than inventing a new one. That is the defence against being read as "another AI toy".

Written as one word — **Readback**, not ReadBack: that keeps distance from ReadBack Medical Imaging (a live company in radiology/PACS — a different segment, but the spelling coincides). `github.com/readback` is free. The full breakdown of candidates and collisions lived in the naming reference, which has since been removed.

---

## 1. One sentence

A voice agent for prescription intake that, for every extracted field, presents the source words with timecodes, the recogniser's confidence and the result of an independent check — and physically cannot write a value that failed its validator or was never confirmed aloud.

## 2. The problem

AssemblyAI states it themselves, in an article dated 8 September 2026:

> A voice agent is a chain, and the LLM has no way of knowing that its input was wrong.

In prescription intake that is not an abstraction. Their own example: "Lisinopril" is recognised as "Bisoprolol" — drugs of different classes, both real, both plausible in context. There is no error signal. The LLM confidently files an order for the wrong medication.

Three figures that set the scale (all from the AssemblyAI signals; source: AssemblyAI):

| Fact | Value |
|---|---|
| Entity Error Rate for Universal-3.5 Pro Realtime | 15.31% at WER 6.99% |
| Errors on proper nouns (and drug names are proper nouns) | 16.92% |
| Success of a five-turn scenario at 84.69% capture accuracy per turn | **43.6%** |
| The same scenario with confirmation steps | **79.1%** |

The last two rows are the whole business case of the product in two numbers. A confirmation loop nearly doubles the share of successful transactions. And AssemblyAI presents it as a technique, not as a shipped feature: implementing it and measuring it is our work.

## 3. Why pharmacy specifically

Of the five domains worked through ([domain-data.md](domain-data.md)), pharmacy wins for one reason nobody else has:

**The regulator has already published an adversarial set.** Lists of confusable names exist precisely because the confusion kills people:

| Set | What is inside | Status |
|---|---|---|
| [ISMP List of Confused Drug Names (2023)](https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf) | Ready-made look-alike/sound-alike (LASA) pairs | downloaded, 632 KB |
| [ISMP Error-Prone Abbreviations (2024-04)](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf) | Dangerous sig codes: `qd` against `qid`, `U` against `0`, `MSO4` against `MgSO4` | downloaded, 330 KB |
| [FDA Name Differentiation Project](https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project) | 23 official pairs with tall-man spelling (vinBLAStine / vinCRIStine, CISplatin / CARBOplatin) | 23 pairs read |

That removes the main vulnerability of any hackathon metric — "and why is your test set representative?". The answer: the set was not assembled by me, it was assembled by ISMP and the FDA, and every pair has a documented clinical harm.

**A dictionary for keyterms — no registration.** [FDA NDC Directory](https://www.accessdata.fda.gov/cder/ndctext.zip), 10.8 MB zip → 70 MB TSV, **116,155 products** (verified: downloaded, unpacked, counted). Public domain. Plus the [openFDA NDC API](https://api.fda.gov/drug/ndc.json) with no key — 137,830 records.

**AssemblyAI has a parameter dedicated to this domain.** In Streaming STT: `domain: medical-v1`. And promptability gives, by their figures, **−43% errors on medical terms**. So we have something to switch on, and something to measure by switching it on.

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
Drug:          Lisinopril
Strength:      10 mg
Form:          tablet
Quantity:      30
Sig:           1 tablet by mouth once daily
Prescriber:    NPI 1245319599
DEA (if CS):   —
Patient:       Jane Doe (fictitious)
```

### The key moment: what a field looks like in the UI

Every field is not merely a value but a record with provenance:

| Element | Where it comes from | What it is for |
|---|---|---|
| Value | extraction from the transcript | the data itself |
| Source words + timecodes | `words[]` from `Turn`, the `start`/`end` fields in ms | clicking the field highlights exactly those words and plays the fragment |
| Confidence | `confidence` on the source words, minimum over the span | the numeric threshold for a re-ask |
| Validator status | local check (DEA/NPI mod-10/Luhn, NDC format, lookup) | an objective "does not add up" |
| Confirmation status | `unconfirmed` / `read_back_pending` / `confirmed_by_voice` | it is visible what was confirmed aloud |
| LASA risk | membership in an ISMP/FDA pair | "Lisinopril sounds like Bisoprolol — which one?" |

### Three reasons the agent is obliged to re-ask

This is not a prompt, it is code. The function that writes into the order accepts only a `ConfirmedValue` object, which cannot be constructed around the checks:

1. **Low confidence.** The minimum `confidence` over the source words is below the field's threshold (the drug name's threshold is higher than the quantity's).
2. **Validator failure.** DEA/NPI does not add up against its checksum; NDC is the wrong format; the drug × strength × form combination is not in the catalogue.
3. **Confusion risk.** The recognised name is part of a LASA pair from the ISMP list or of the 23 FDA pairs — then the re-ask is mandatory regardless of confidence, and the agent names both alternatives.

The third point is the most interesting place in the product. High recogniser confidence here **does not mean** being right: the model can be certain of "Bisoprolol" because it heard it clearly, while the human said "Lisinopril". Confidence does not protect against homophony; a regulator's list does.

### A critical subtlety: keyterms must not be fed the same words the rules look for

The insight comes from the breakdown of claim-intake-agent and Saakshi (the competitor review), and it applies directly here. If you feed both names of a LASA pair into `keyterms_prompt`, the recogniser starts latching onto them, and the observation stops being independent of the check: we get confirmation of the very hint we supplied.

So the dictionaries are split:

- **Keyterms do get** identifying context: the clinic name, the physician's name, the dosage form names, the units of measurement.
- **Keyterms do NOT get** a single drug name from the LASA pairs under check.

And a test is written for this, which fails if someone adds a checked term to the biasing dictionary. That is also a ready-made substantive finding for the "what we learned about the API" section.

---

## 5. Architecture

Stack: **one Next.js application on Vercel, TypeScript throughout**. No Docker, no
always-on process, no database server.

### Why a hybrid rather than the Voice Agent API alone

AssemblyAI writes it themselves: a cascaded pipeline can be debugged, whereas an
audio-in/audio-out black box gives no way to see a recognition error. We need `words[]`
with timecodes and confidence, so Streaming STT is mandatory. The conversational loop with
turn detection and barge-in is cheaper taken ready-made from the Voice Agent API.

25 of 45 competitors took only the black box. The hybrid is a difference from the outset.

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

`domain=medical-v1` and `prompt` are exactly the promptability and domain context that, by AssemblyAI's figures, give −43% errors on medical terms. We switch them on not because we can, but because it is a measurable delta: a run with them and a run without them is a ready-made experiment.

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

The asymmetry between `arguments` (an object) and `result` (a string) is real and not obvious. The LLM Gateway model has to be picked from those capable of tool calling: `gemini-2.5-flash`, `gpt-5-mini`, `claude-haiku-4-5`. The default in the documentation's examples, `qwen3.5-4b-32k-fast`, **cannot** do tool calling — a ready-made trap for competitors and a reason for a line in the README.

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

Here the project takes a category nobody in the field occupied (the competitor review: measured latency was presented only by Saakshi, observability by nobody).

### Metrics

| Metric | Method | AssemblyAI's benchmark |
|---|---|---|
| **Entity Error Rate** | on the held-out set, over turns with entities, by hand | their reference 15.31% |
| EER with `domain=medical-v1` and `prompt` against without them | A/B on the same audio | their claim −43% on medical terms |
| **Turn-to-turn latency** | from end of speech to the first byte of sound, N ≥ 30 | P95 < 1500 ms |
| Finalization delay | from the `Turn` messages | P95 < 500 ms |
| **Caller repeat rate** | consecutive repetitions of a phrase, segmented by the agent's preceding question | their example: 19% on email, 1% on yes/no |
| **Scenario success: gate on / gate off** | the same set, two runs | we reproduce their 43.6% → 79.1% |
| Share of errors caught by a validator against those caught by a re-ask | breakdown | — |
| Cost per completed order | not $/hour | their formulation |

### How to make the proof honest

**Held-out.** The set is labelled in the first two days and is not used for tuning even once before the final evaluation. This is a direct way around Saakshi's weakness: their precision of 1.00 was obtained on a sample of 70 utterances in which they themselves corrected 9 patterns after a disagreement with the labels. They honestly called it a "regression suite, not a generalisation estimate" — and if we have a held-out set, our figure is stronger in meaning even if numerically worse.

**Corpus.** On AssemblyAI's recommendation — 50 worst cases: telephone quality (8 kHz mulaw, `encoding=pcm_mulaw`), background noise, accents, interruptions, false starts. And LASA pairs from ISMP in both directions, without fail.

**Synthesis without PII.** DEA and NPI numbers are generated from their checksums; drugs and strengths come from the NDC catalogue; patient names are fictitious. Ground truth for every file is known by construction — so EER is computed without contestable manual labelling on the fields that have a validator.

### Observability as a product feature

A dedicated `/metrics` page in the application, not a section in the README:

- P50/P95/P99 by latency component
- entity capture rate by field type
- caller repeat rate broken down by the agent's question
- WebSocket close codes: **3007** (malformed chunks), **3008** (the three-hour cap, a billing leak), **3009** (session limit) — logged from the Error frame, not from the truncated reason
- session cost

Every number on the page carries the command that produced it. Not one figure without a method — a direct contrast with Veritas, where the benchmarks contradict one another, and with RevenueFlow, where the README says 8 tests and the devpost says 177.

---

## 7. The demo for a judge

The judge is alone, time is short, and there may be no microphone. Hence three modes:

**Mode 1 — live conversation.** A microphone, a real dialogue, field cards visible with confidence and word highlighting.

**Mode 2 — judge-solo (mandatory).** A "Run the scenario" button: substitute audio from the corpus instead of a microphone, the full path to a finished order. Works without microphone permission and without a second person. Saakshi provided for this, and they were right to.

**Mode 3 — "catch the error".** The most convincing one. A file is played in which "Lisinopril" was spoken but the recogniser returns "Bisoprolol" with high confidence. On screen: the agent does **not** file the order, it says aloud that this is a pair from the ISMP list and asks for clarification. Beside it, the same file with the gate switched off, where the order goes out with the wrong drug.

That is 40 seconds which explain the whole product without words.

### Video script (2 minutes)

| Time | What is shown |
|---|---|
| 0:00–0:15 | The problem: the Lisinopril → Bisoprolol example, the figure 43.6% |
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

## 10. How this beats each of the dangerous competitors

| Competitor | Their strength | Our answer |
|---|---|---|
| **Saakshi** | 418 tests, p50 1368 ms, three API surfaces, hash-chain | A held-out set against their regression sample. LLM Gateway as the main path against their Groq. Their precision of 1.00 was obtained on a sample they corrected themselves — our figure is more honest in meaning |
| **VoiceMed AI** | Strictly specification-conformant Voice Agent API, 44 tests | Their only measured number is 5.63 s to the greeting; turn-to-turn they did not measure. Our turn-to-turn P95 plus a cold start under a second. Their base is 20 symptoms; ours is 116,155 products |
| **claim-intake-agent** | The best insight: keyterms destroy the independence of the observation | We take that insight and carry it through to a test that fails on violation. Their evidence is n=3 and "my recollection"; ours is a held-out set and saved audio |
| **Voice Action Gate** | The best gate idea: a capability instead of an `if`, the witness built before the proposal appears | Their live path browser→WS→gate was never run once, `READ_BACK_CONFIRMED` is not implemented, and the agent is a regex. We have a live run, an implemented read-back and an LLM with a JSON schema |
| **Veritas Clinical AI** | The best presentation | Their benchmarks contradict one another, the Loom leads to the repository, the demo is on `localhost:3000`, and the safety filters are disabled with no disclaimer. We have a working demo, reproducible numbers and an explicit disclaimer |
| **Officer Parker** / **MockMate** | Depth in the Voice Agent API | We take their depth and add the numbers MockMate does not have at all |
| **Brand Studio Agent** | Async `reply.create`, forced JSON | Three of their five layers are marked as planned. In our pitch there is only what works |

### Honestly about our weak position: Originality

The gate idea is not ours. Voice Action Gate formulated it earlier and better ("a capability instead of an `if`"), Saakshi implemented it in their niche with 418 tests, and claim-intake-agent found the central insight about keyterms. The provability niche is the most crowded at this hackathon: six projects.

We enter it seventh and win not by novelty but by execution. What is genuinely new in our case:

1. **A regulator's LASA list as the source of an adversarial corpus.** Not one of the 45 projects used a ready-made set assembled by ISMP and the FDA. They either invented their tests themselves or did not test.
2. **A re-ask at confidence 1.0.** Every other gate fires on low confidence or on validator failure. Our rule that "high confidence does not protect against homophony" is a different logic: the recogniser can be absolutely certain and absolutely wrong.
3. **A held-out set, sealed since day 2.** Even Saakshi honestly called their own estimate a regression one.

This has to be said in the pitch by us, before the judge asks. An admission that "the gate idea is not new, this is what is new" reads as maturity, not as weakness.

---

## 11. Risks and what to do

| Risk | Likelihood | Response |
|---|---|---|
| `domain=medical-v1` gives a smaller delta than the claimed −43% | medium | We publish the measurement as it is. A negative result with a method is stronger than somebody else's figure with no check. That is exactly the material for the "what we learned about the API" section |
| The LASA pairs are recognised too well and the gate never fires | medium | The corpus is degraded on purpose: 8 kHz mulaw, noise, fast speech. AssemblyAI writes themselves that the degradation comes from real audio, not from the model |
| Not enough time for everything | high | Order of cuts: first judge modes 2 and 3, then `/metrics`, then UI polish. The gate and the measurements are not to be cut |
| The judge opens the demo while the backend is down | medium | An always-on instance, plus a page that honestly shows status, plus mode 2 on a pre-recorded run |
| Medical liability in the pitch | low | An explicit disclaimer: a technology demonstration, not a medical device, synthetic data. Veritas exposed themselves on this by disabling the safety filters |
| NDC regulation changes | low | [The FDA proposes a single NDC format](https://www.federalregister.gov/documents/2026/03/05/2026-04368/revising-the-national-drug-code-format-and-drug-label-barcode-requirements) — mention it as context awareness |

---

## 12. What to say in one paragraph at the pitch

In prescription intake a recognition error does not look like an error: "Lisinopril" becomes "Bisoprolol", both drugs exist, the LLM confidently files the order, and there is no signal. By AssemblyAI's figures, at an entity capture accuracy of 84.69% per turn a five-turn scenario reaches the end in 43.6% of cases, and with confirmation steps in 79.1%. Readback implements that confirmation as an architectural constraint: a value does not enter the order if the checksum did not add up, if the confidence is below the threshold, or if the name is part of the published ISMP list of confused drugs. Every field shows the source words with timecodes and the recogniser's confidence, and the metrics page shows Entity Error Rate on the held-out set, latency P95 by component and caller repeat rate, with the commands to reproduce every figure.
