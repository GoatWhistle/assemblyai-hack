# Readback

[![verify](https://github.com/GoatWhistle/assemblyai-hack/actions/workflows/verify.yml/badge.svg)](https://github.com/GoatWhistle/assemblyai-hack/actions/workflows/verify.yml)

A voice agent that takes prescription orders and proves it did not mishear.

Every field carries provenance: which spoken words produced the value, with
millisecond timecodes, the recognizer's confidence over those words, and the verdict
of an independent validator. A value cannot enter the order unless a validator passed
it or a human confirmed it aloud.

Built for the [AssemblyAI Voice Agent Hackathon](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon).

## The problem

A recognition error in prescription intake does not look like an error. "Lisinopril"
becomes "Bisoprolol" — both drugs exist, both are plausible, and nothing signals a
fault. As AssemblyAI puts it: *a voice agent is a chain, and the LLM has no way to
know its input was wrong.*

Their numbers set the scale:

| Fact | Value |
|---|---|
| Entity Error Rate, Universal-3.5 Pro Realtime | **15.31%** at 6.99% WER |
| Errors on proper nouns, which drug names are | **16.92%** |
| Five-turn task success at 84.69% per-turn entity capture | **43.6%** |
| The same task with confirmation steps | **79.1%** |

The last two lines are the whole business case. A confirmation loop nearly doubles
the share of transactions that complete, and AssemblyAI presents it as a technique
rather than a feature — implementing and measuring it is the work.

## The hard claim

**High recognizer confidence does not protect against homophony.** The model can be
certain it heard Bisoprolol while the human said Lisinopril. Confidence proves
nothing there; a regulator-published look-alike sound-alike list does.

So a drug name inside a published ISMP or FDA LASA pair triggers a **mandatory
re-ask even at confidence 1.0**. Every other gate in this field fires on low
confidence or a failed validator. This one fires on a name, regardless of how sure
the recognizer is.

## Why it is called Readback

The name is the procedure, not a metaphor.

**Aviation, ICAO Annex 11 §3.7.3:** *a procedure whereby the receiving station
repeats a received message or an appropriate part thereof back to the transmitting
station so as to obtain confirmation of correct reception.*

**Clinical practice, Joint Commission National Patient Safety Goals, since 2003:**
*for verbal or telephone orders or for telephonic reporting of critical test results,
verify the complete order or test result by having the person receiving the order or
test result read-back the complete order or test result.*

Medicine borrowed the readback/hearback pair straight from aviation. We automate a
step regulation already requires and practice routinely skips, which
[ISMP documents](https://www.ismp.org/sites/default/files/attachments/2018-03/20170518.pdf).

## Three reasons the agent re-asks

Not interchangeable, and enforced in code rather than in a prompt:

1. **Confidence below the field threshold** — the minimum over the source words.
2. **Validator failure** — DEA mod-10, NPI Luhn with the `80840` prefix, NDC format
   plus existence in the catalogue, or an internally inconsistent
   drug × strength × form × route combination.
3. **LASA pair membership** — fires regardless of confidence.

`ConfirmedValue` cannot be constructed outside the gate: it is a branded type whose
brand is module-private, and the order accepts nothing else. There is no code path by
which "the model decided it was fine" writes a value.

## What is proved by arithmetic and what is not

Stated plainly, because the distinction matters and is easy to overclaim:

- **DEA and NPI are arithmetic.** A checksum rejects a mistyped digit independently
  of what the recognizer heard. Verified by hand: `AB1234563` passes and `BX1234567`
  is rejected; `1234567893` passes and `1234567890` is rejected. These fields
  therefore skip mandatory read-back — a checksum is stronger than a repetition.
- **NDC has no check digit.** A drug name, strength, form and route are proved by
  existence in the built catalogue and by the combination being internally
  consistent. Calling that a checksum would be a lie.
- **A field with no validator must be read back.** `patientName` has neither, so it
  is confirmed by voice or not at all. A test enforces this implication across the
  whole policy table.

## Stack

One Next.js application on Vercel. No Docker, no always-on process, no database
server.

The browser holds both AssemblyAI sockets directly using short-lived tokens; our
routes mint those tokens, serve the agent's server-side HTTP tools, and store
finished sessions in Vercel Blob. AssemblyAI's docs state no proxy is required, and
the same shape is the documented Vercel pattern: mint on the server, hand the browser
a token.

```
browser ──► wss://streaming.assemblyai.com/v3/ws    word timings, confidence
        ──► wss://agents.assemblyai.com/v1/ws       conversation, turn detection
        ──► /api/tokens/*                           short-lived tokens
AssemblyAI ─► /api/tools/*                          server-side tool calls
```

## Running

```bash
npm ci
cp .env.example .env.local
make data
make agent
make dev
make verify
```

`make data` builds the NDC catalogue and the LASA table into `data/`. `make agent`
creates the stored agent once and prints the id to put in `.env.local`. `make dev`
serves on `http://localhost:3000`. `make verify` runs the linters, the type checker,
the tests and every ratchet.

`ASSEMBLYAI_API_KEY` is required for `make agent` and for any live session; the tests
and the recorded-session demo run without it.

Server-side tools need a publicly reachable HTTPS host, so they are debugged on a
preview deployment rather than localhost.

## Engineering rules

Enforced mechanically, not by convention. `make verify` runs all of it.

| Rule | Check |
|---|---|
| No file over 250 lines | `make file-length` (ratchet over a baseline) |
| No directory over 20 sources / 30 tests | `make package-size` |
| No import cycles, test imports included | `make import-cycles` |
| The gate imports nothing but domain, validators, lasa, catalog | `make import-cycles` |
| No directory named utils, common, helpers | `make package-subject` |
| English only in code | `make ascii` |
| No raw hex outside the token files | `make tokens` |
| Body text reaches 4.5:1 against its surface | `make contrast` |
| The API key never leaves `app/api/` | `make secrets` |
| No LASA-checked drug name in keyterms | `make keyterms-purity` |
| The held-out set is unchanged since sealing | `make heldout-seal` |
| `ConfirmedValue` is built only inside the gate | `make gate-invariant` |
| Every gate branch dies to its own test | `make gate-mutation` |

`make gate-mutation` breaks one gate branch at a time and requires the matching test
to fail **by name**, then restores the file byte for byte. A mutation that survives
is a defect in the test, not proof of the code. The check fails when the gate file is
absent — absence must never read as success.

There are no comments in this repository. Not line, not block, not JSDoc, not `#` in
configuration. Explanations live in `CLAUDE.md` and `docs/`, where they can be read
in full rather than in fragments beside code.

## Honest limits

Stated here rather than left to be discovered.

- **Provenance is computed in the browser.** With the browser holding the STT socket
  directly, `words[]` never passes through our server, so provenance is
  client-supplied data. For a demonstration this is irrelevant; making it trustworthy
  would require routing audio through our own host. Turn-level numbers from
  `GET /v1/sessions/{id}` are server-side and honest; word-level timings are not
  available there, so word-to-gate latency is a browser measurement and is labelled
  as one.
- **The evaluation corpus is synthesised.** No open English corpus of human speech
  reading drug names exists. Entity Error Rate here measures the recognizer against
  synthetic speech, not human speech, and the report says so.
- **The LASA table is curated, not complete.** Of roughly 960 pairs in the ISMP list,
  about 240 survive matching against the current catalogue; the rest name brands no
  longer marketed.
- **Thresholds are initial values, not measured optima.** They are tuned on a
  development set and reported against a held-out set that is sealed before
  development starts.
- Every figure in `eval/REPORT.md` carries the command that produced it and the size
  of the set it came from. Numbers without a method are not published.

**This is a technology demonstration, not a medical device.** All data is synthetic:
no real patients, no real prescriptions, no clinical use.

## Documentation

- [CLAUDE.md](CLAUDE.md) — domain rules, the gate invariant, working rules
- [docs/plan.md](docs/plan.md) — architecture, the contract between two agents, the schedule
- [docs/cases/readback.md](docs/cases/readback.md) — why this problem and this domain
- [docs/cases/readback-spec.md](docs/cases/readback-spec.md) — data model, gate branches, tool schemas, metric formulas
- [docs/reference/](docs/reference/) — AssemblyAI protocol, data sources, platform constraints

## Licence

[MIT](LICENSE).
