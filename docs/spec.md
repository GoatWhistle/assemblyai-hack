# Readback — the engineering specification

What this document holds is the reasoning the code cannot carry: why a threshold is the
number it is, why the gate's branches are in that order, why a drug name must never enter
`keyterms_prompt`, what exactly each metric counts and what it refuses to count. The
shapes, the values and the branches themselves live in `src/` and are not restated here.

The case for the product is [case.md](case.md). The protocol as observed is
[assemblyai-api.md](assemblyai-api.md). The catalogues and their filters are
[domain-data.md](domain-data.md). What the project cannot prove is
[limitations.md](limitations.md), and the measurements are [../eval/REPORT.md](../eval/REPORT.md).

**A note on this document's history.** The first version was written against a
FastAPI + SQLite + React design, before any code existed, and it carried that design in
34 Python blocks and a 215-line SQLite schema. That design was dropped: the application is
one Next.js deployment on Vercel with no database, the browser holds both AssemblyAI
sockets directly, and finished sessions go to Vercel Blob through `src/sessions/`. The
logic, the branch order, the reason codes and the metric definitions survived the move
unchanged and are what remains below. The Python, the DDL, the container paths and the
`DATABASE_PATH` did not, and have been deleted rather than translated — the TypeScript
that replaced them is in `src/`, and a second copy in another language would only drift.

**The discipline of numbers in this document.** No figure here is a measurement. Every
threshold, timing and limit is an initial value, tuned on the dev set only. The
AssemblyAI numbers that appear (15.31% EER, 43.6% → 79.1%) are the vendor's publications,
not our measurements, and they carry that attribution everywhere they are used. Measured
values live in [../eval/REPORT.md](../eval/REPORT.md) with the command that produced each
one.

---

## 1. The data model — where it lives and what it must guarantee

The types are `src/domain/`: `WordSpan`, `Provenance`, `ValidatorVerdict`, `LasaRisk`,
`FieldCandidate`, `ConfirmedValue`, `Order`, `GateDecision`. The gate is `src/gate/`.
Read those for the shapes. What follows is only the reasoning behind them.

**Provenance is the unit, and a value without one has no right to exist.** A `Provenance`
requires at least one source word. That refusal sits before the gate: with no words there
is no `Provenance`, with no `Provenance` there is no `FieldCandidate`, and therefore no
`ConfirmedValue`. This is also what closes off a hallucinated value — if the agent invents
a name nobody said, the transcript hint does not match any word of the turn and the field
cannot be assembled.

**Thresholds compare against the minimum confidence over the span, never the mean.** The
mean masks exactly the case the product exists for: "Lisinopril ten milligrams" at
`[0.42, 0.99, 0.99]` has a mean of 0.80 while failing on the one word that is the drug
name. The minimum is a conservative aggregation and a deliberate choice in favour of extra
re-asks.

**The formatted transcript and the concatenation of words are both stored, and neither is
chosen over the other.** With `format_turns` on they differ — punctuation, number casting.
Highlighting in the browser needs the words; showing a person a sentence needs the
transcript slice. Storing one and deriving the other loses information in whichever
direction it is done.

**A verdict cites a rule, not an opinion.** Every `ValidatorVerdict` carries the concrete
rule it applied, and these are the strings a judge sees in the field card:

| validator | the rule cited |
|---|---|
| `npi_luhn` | Luhn mod-10 over `80840` plus the first 9 digits (ISO/IEC 7812 issuer ID 80840) |
| `dea_mod10` | `(d1+d3+d5) + 2*(d2+d4+d6)`; last digit of the result equals `d7` |
| `ndc_format` | FDA NDC format: 10-digit 4-4-2/5-3-2/5-4-1 or 11-digit strictly 5-4-2 |
| `ndc_catalog` | catalogue lookup: proprietary or nonproprietary name, exact match |
| `combo_consistency` | the `(drug, strength, dosage form, route)` tuple must exist in the catalogue |
| `sig_abbrev` | ISMP Error-Prone Abbreviations 2024-04: the abbreviation is on the do-not-use list |
| `none` | no independent validator exists for this field |

"It did not add up" without the rule cited is not proof. The verdicts themselves are in
`src/validators/`, and the hand-checked worked examples behind the arithmetic are in
[domain-data.md](domain-data.md).

**A field with no validator is not a passed field.** The outcome `not_applicable` exists
separately from `passed` because `patientName` has no checksum and no catalogue, and
reporting that as passed would be a lie in the audit. The implication runs the other way
too: `validator === "none"` forces `readBackAlways === true`, and a test asserts it over
the whole policy table, so a new field cannot be added without deciding how it is proved.

**`ConfirmedValue` cannot be constructed outside the gate, and that is mechanical rather
than agreed.** In TypeScript it is a branded type whose brand symbol is module-private,
plus `confirm()` as the only exported path; `Order.setField` accepts nothing else. So
"the model decided it was fine" has no code path into the order. `make gate-invariant`
fails if a second assertion appears in any of its three syntaxes, if the single legitimate
one disappears, or if a double assertion shows up that could forge any branded type.

The weak point is named here rather than waited for: the invariant stops carelessness and
structural mistakes, not a determined author of the same module. No barrier in a language
with structural types can do more, and [limitations.md](limitations.md) says so plainly.

**A value the speech does not support is a validator failure, not a fourth reason to
re-ask.** The agent supplies the value to `propose_field` and can supply a name nobody
said while quoting a hint that really does trace to a turn.
`src/sessions/reconcile-value.ts` reconciles the two and returns a verdict named
`spoken_support`, which enters the existing inconsistent-combination branch. The name is
deliberately not a checksum's name: borrowing one would claim a proof that never ran.

**The controlled-substance flag comes from the catalogue, not from the caller.** A DEA
number joins the required set only when the proposed product carries a DEA schedule in the
built data. "This is a controlled substance" is therefore a conclusion from the directory,
not a claim the agent can make on its own.

---

## 2. Thresholds: why the numbers are what they are

**The values live in `src/domain/policy.ts` and are not copied here.** That file is the
single place a threshold, an attempt limit, a criticality or a spell-out style is written
down, and a table in this document would be the duplicate-formulation defect — two sources
of one truth, with the prose copy the one that silently goes stale. What this section holds
is the reasoning, which the code cannot carry.

**None of the thresholds has been measured.** They are initial values from four lines of
reasoning, tuned on the dev set only.

**First: the cost of an error on a field, not its frequency.** A wrong drug name is a
different class of medicine; a wrong days-supply is an inconvenience. That is the whole
spread from the highest threshold to the lowest, and re-asks are spent deliberately where
the error is expensive.

**Second: recognition of proper nouns is the hard case, by the vendor's own numbers.**
AssemblyAI publishes an EER of 15.31% at a WER of 6.99%, and 16.92% on proper nouns —
their figures, not ours. A drug name is a proper noun. If roughly every sixth entity
arrives wrong, the auto-accept threshold on that field has to be high enough that
auto-accept is a rare event rather than the normal path. The drug-name threshold is a bet
that read-back becomes the main path, which is why that field also carries
`readBackAlways` — the threshold there is insurance, not the working mechanism.

**Third: where arithmetic exists, voice is not spent.** NPI and DEA carry a lower
threshold and `readBackAlways: false`, not because they matter less but because a checksum
rejects a mistyped digit independently of what the recogniser heard. Reading a nine-digit
number back aloud lengthens the call without adding proof. If the checksum fails,
read-back and then spell-out become mandatory, and that is no longer a threshold question.

**The two checksums are not equally strong, and it would be easy to write that they are.**
`make audit-checksums` enumerates every single-digit substitution and every adjacent
transposition over 200 valid identifiers of each kind. NPI catches every substitution and
misses the 0-to-9 adjacent swap. DEA misses a class of substitution by construction: its
scheme weights alternating digits by 1 and 2 and sums mod 10, so a substitution changing a
weight-2 digit by five is invisible to it. The policy stands — arithmetic on most
substitutions is far better proof than reading seven digits aloud — but the two must never
be described as equivalent, and neither coverage figure is quoted from memory:
`tests/validators/checksum-coverage.test.ts` pins both, including a test that fails if DEA
coverage ever silently reads as complete.

**Fourth: read-back on the patient name is about the absence of a validator, not about
importance.** The rule is the implication stated in section 1, and it is enforced by a
test rather than by discipline.

**Which fields are LASA-checked is a policy decision with a cost.** The check is applied
where a published pair can exist for the value; on the remaining fields it would find
nothing and only spend latency. `policy.ts` holds which fields carry `lasaChecked`, and the
curated pair table is `src/lasa/pairs.ts`.

**The order of tuning, when tuning happens.** A threshold is raised if an accepted
incorrect value is found on held-out — that is a safety failure. A threshold is lowered if
the false-ask rate for a field is high with zero accepted incorrect values — that is a
usability failure. The boundary of tolerance is itself an initial value, not a measurement.

---

## 3. The gate: the branch order and why it is exactly this one

The decision function is `src/gate/decide.ts`; the reason codes are
`src/domain/reason-codes.ts`; the actions are in `src/domain/enums.ts`. The branch order
is the content of this section, because it is the one part of the gate that cannot be read
off the types.

| Reason code | The branch | Action |
|---|---|---|
| `X_ESCALATE_AFTER_THIRD_FAILURE` | the attempt limit is reached on a critical field | escalate to a human |
| `X_ABORT_NON_CRITICAL` | the attempt limit is reached, the field is not critical | abort the field |
| `E_NORMALIZE_FAILED` | the normaliser produced nothing | ask to confirm |
| `E_VALIDATOR_CHECKSUM` | a failed checksum | ask to spell out, immediately |
| `E_VALIDATOR_FORMAT` | an invalid format | ask to spell out |
| `E_VALIDATOR_CATALOG` | not in the catalogue | ask to confirm |
| `E_VALIDATOR_COMBO` | the combination does not exist | ask which part is wrong |
| `E_LASA_HIT` | the name is in a published pair | ask to disambiguate — **always, even at confidence 1.0** |
| `E_NO_VALIDATOR` | no validator applies to this field | ask to confirm, read-back mode |
| `X_SPELLOUT_AFTER_SECOND_FAILURE` | confidence is below the threshold and the spell-out limit is reached | ask to spell out |
| `E_LOW_CONFIDENCE` | confidence is below the threshold | ask to confirm, read-back mode |
| `E_READ_BACK_REQUIRED` | everything passed, but the field is always read back | ask to confirm, read-back mode |
| `A_VALIDATOR_PASSED_HIGH_CONF` | a clean pass | accept, validator mode |

**Escalation goes first, or the gate does not terminate.** A field that consistently fails
its validator would otherwise spin forever: the checksum branch returns a spell-out every
time and the attempt counter is never read. Checking the limit before any decision logic
is the only way to guarantee termination, and a test asserts that a candidate at the limit
always yields a terminal decision.

**LASA goes after the validators.** "This drug is not in the catalogue" is a more
informative re-ask than "did you perhaps confuse it with" — there is no sense offering a
choice between two names when what was recognised does not exist at all.

**LASA goes before the confidence threshold, and this is the product.** Put it after, and
a candidate at confidence 0.99 is accepted and the LASA branch is never reached. That is
precisely the scenario to catch: the recogniser is certain it heard Bisoprolol while the
human said Lisinopril. The recogniser's certainty is certainty about the acoustics, not
about which word was spoken; homophony breaks straight through it, and no numerical value
of confidence protects against it. The only protection is a regulator's published list,
and it has to be applied before any numerical condition. A test pins the ask at confidence
1.0 by name, and `make gate-mutation` breaks each branch in turn and requires the matching
test to fail by its reason code.

**The re-ask wording comes from the gate, not from the model.** The decision carries the
sentence the tool returns, so the text that is logged and the text the human heard are one
string. The agent may deliver it in its own voice — it is a conversational agent — but the
base text is code, because the caller repeat rate depends on the wording and that rate is
one of the metrics in section 7.

**The escalation ladder.** An ordinary re-ask first, then a re-ask with different wording,
then spell-out, then escalation for a critical field or an abort for a non-critical one.
The limits per field are in `policy.ts`; the reasoning is that a nine-digit number should
not be re-asked in full twice — if the checksum failed, the error is in one character, and
spelling it out is the only way to localise it — while a drug name often survives a plain
repeat, and a long NATO alphabet over twelve letters is an irritating procedure to reach
for early.

**Escalation is mandatory, and there is no pharmacist at a hackathon.** The order is
marked as needing one, `commit_order` refuses with its own code, and a banner shows why.
That is more honest than mixing in a value tagged low-confidence: no `ConfirmedValue` is
created, so the field is physically empty and the missing-critical list shows it.

### 3.1 Spell-out

The implementation is `src/gate/spell-out.ts`. The rules behind it:

**Codes use the NATO alphabet, in both directions.** The agent pronounces in NATO and
expects NATO or individual letters on the way in. The reason for a letter alphabet
specifically here is that `B`/`D`/`P`/`T`/`V` and `M`/`N` are the classic recogniser
confusions on a telephone channel, and they are exactly what the letter prefix of a DEA
number is made of. The official spellings are `Alfa` and `Juliett`.

**Numbers go digit by digit, never in groups.** "Twenty-three" is recognised as "twenty
three" and normalises to either 23 or 20 and 3 — an ambiguity that must not exist in a
quantity field. Grouped numbers are not accepted in spell-out mode at all.

**Spell-out grants no leniency.** The candidate is reassembled with a fresh provenance — a
new turn, new words — and goes through the gate again from scratch. A reassembled NPI that
fails Luhn again is the same checksum failure with a higher attempt count.

**The confirmation is recorded verbatim.** What is stored is the phrase spelled out aloud,
not the result of normalising it. The audit shows what the human confirmed, not what we
inferred from it.

---

## 4. The tool contracts

The five tools are built in `src/agent/tools.ts` and served from `app/api/tools/`. The
JSON schemas there are the contract; the constraints and the decisions behind them are
here.

**Tools run server-side over HTTPS, and the vendor calls them.** The agent is created once
with `POST https://agents.assemblyai.com/v1/agents`, each tool carries an `http.url`
pointing at our deployment, and AssemblyAI issues the request. There is no
`tool.call`/`tool.result` exchange in the browser at all, and each invocation is an
ordinary short request — which is what makes a serverless function fit a two-to-ten-minute
session.

The platform constraints, all four load-bearing:

- **HTTPS and a publicly reachable host only.** Localhost and private ranges are rejected,
  so tools are debugged on a preview deployment or through a tunnel.
- **The response is truncated at 8 KiB.** A tool result is designed to fit, not trimmed
  after the fact.
- **Headers are write-only.** That is where the shared secret goes, and it is why the
  secret never appears in a URL.
- **`commit_order` runs in `execution_mode: "hold"` and is the only tool that does.** The
  agent pauses rather than talking over a write. Every other tool is `interactive`: the
  agent keeps the floor while a local lookup runs.

### 4.1 `lookup_drug`

Searches the built catalogue by spoken name and returns only combinations that exist. The
agent is instructed to call it before proposing a drug name, strength, dosage form or
route, and never to propose a combination the tool did not return.

The result carries a LASA warning when the matched name is in a curated pair. That is an
optimisation, not a protection: it lets the model go straight to read-back instead of
spending a round on `propose_field` returning a disambiguation. If the model ignores the
warning, the gate returns `E_LASA_HIT` anyway. **The protection is in the code; the hint is
in the prompt.**

There is no network call at runtime. The catalogue is built offline by `scripts/build-ndc.ts`
into `data/` and read through `src/catalog/`; openFDA is a build-time source only.

### 4.2 `validate_prescriber`

Two arithmetic checks, both local: Luhn with the `80840` prefix for the NPI, mod-10 for
the DEA. The schemas require digits — ten with no separators for the NPI, two letters and
seven digits for the DEA — so a value like "one two four five" fails schema validation and
the model is told to pass digits. Normalisation is our code's job, not the model's.

**Registry lookup is deliberately absent, and the README says so.** The existence of an
NPI can be checked through the keyless NPI Registry API, but our NPIs are synthetic,
generated from the checksum, and are not in the registry. Calling it and getting "not
found" for a number that provably adds up would add noise to the demo. The extension point
exists and is switched off because the data is synthetic, not because it could not be
built.

### 4.3 `propose_field` — the only path to a field, and it does not write

Every field goes through it, and it never writes to the order. It returns a gate decision:
the action, the reason code, the sentence to say, the evidence, and a flag saying whether
anything was written. **That flag is present in every response, including an accept.** It
is not for the model — it is for the audit and for a judge, who can see from the log that
up to the moment of acceptance the order held nothing.

**The transcript hint is the most fragile part of the contract.** The model must copy a
stretch of the caller's utterance verbatim; `src/sessions/provenance-match.ts` looks for
that stretch among the words of the recent turns by a comparison over normalised tokens.
When the match fails, the tool returns a re-ask rather than a decision, and the field
cannot enter the order — which is the hallucination guard of section 1, arriving as an
ordinary conversational turn rather than as an error.

Tolerances in that reconciliation are the ones a recogniser really produces: spoken units,
spelled-out numbers, salt suffixes in either direction, consonant-skeleton drift. A test
asserts over every curated pair, in both directions, that no LASA counterpart is ever
accepted as support for its partner. The mandatory re-ask at confidence 1.0 is unaffected
when the value *is* supported, and that too is pinned by its own test.

### 4.4 `read_back`

Registers that a value is about to be read back and that the caller's next utterance is
the answer, then — on a second call carrying the caller's reply — resolves it.

**It is `interactive`, not `hold`, and that is deliberate.** `hold` would silence the agent
at exactly the moment it is supposed to speak. The point of the tool is to permit the
sentence, not to delay it.

**Resolution is asymmetric towards caution.** A confirmation counts only on explicit
agreement — yes, yeah, correct, that's right, confirmed, right. A denial is no, nope,
wrong, not quite, negative. **Everything else, including silence and a question back, is
not a confirmation** and increments the attempt count. An "err" counted as a yes is
precisely the error the product exists to prevent. If the caller names a different value
instead of answering — the typical response to a disambiguation, naming one of the two
drugs — that is a new candidate, and it goes through the gate from scratch.

### 4.5 `commit_order`

Writes the order, and refuses unless every critical field is a confirmed value. Before
calling it the agent must read the whole order back and get an explicit yes; the tool
takes that sentence verbatim and the caller's answer as a boolean the model is forbidden
to set on its own judgement.

The refusals are distinct because they need different recovery: a critical field missing,
a field escalated to a human, no full read-back, and an already-committed order. The last
is idempotency — a repeat call returns the existing order rather than creating a second
one.

**`hold` here is demonstrative as well as technical.** The judge sees the agent fall silent
for the moment of the write instead of talking over it, and the refusal on an unconfirmed
field is the gate visible live. That refusal is the demo.

### 4.6 The LLM Gateway model

`gemini-2.5-flash`, selected in `src/agent/session-config.ts` and overridable by
environment variable rather than by a code edit — at a hackathon that is the difference
between a minute and half an hour.

Two models in the gateway's capability table are disqualified outright, and one of them is
the default in the vendor's own examples: `qwen3.5-4b-32k-fast` does not support tool
calling, so the agent would simply ignore the tools, and `gpt-oss-120b` cannot stream,
which a voice agent needs. Of the remainder, `gemini-2.5-flash` has tool calling,
structured outputs and streaming, sits in the cheap group, and its context removes any
question about prompt length or history. `gpt-5-mini` is the fallback, in case the
per-model rate limit — documented as a 60-second window with the exact rate unpublished —
starts to bite during a demonstration.

### 4.7 What a session must record

There is no database. Finished sessions go to Vercel Blob through `src/sessions/`, and the
requirements carried forward from the dropped schema are these:

- **The words, in full, with their timings and confidence.** This is the evidential basis
  of provenance and there is no product without it.
- **Every candidate, including the rejected ones.** The rejected ones matter more: the
  false-ask rate of section 7 is computed from them.
- **Every gate decision** with its reason code, the rule cited, the evidence and the
  threshold that was applied.
- **The read-back phrases verbatim** — the sentence the gate produced and the sentence the
  caller confirmed.
- **The configuration sent to the vendor, verbatim, once per session** — the recogniser
  parameters, the agent definition, the keyterms list exactly as sent, the model name, and
  the commit the run was made from. Without those, not one figure in section 7 is
  reproducible, and a keyterms list reconstructed after the fact proves nothing about what
  biased the recogniser.
- **The close code with the error frame**, not the truncated reason string.
- **The sentence the gate returned and the sentence the agent actually spoke, separately.**
  The prompt requires the first to be spoken; how far the model observes that is something
  to see as a number rather than assume.
- **A policy version alongside each decision.** Tuning changes the thresholds, and without
  a version a run from before tuning and one from after look comparable when they must not
  be.

Deliberately not recorded:

- **Audio on the order path.** A live conversation is never written to disk. The reason is
  worth naming: audio of live calls in storage makes this a processor of call recordings,
  with every question that follows, and our proof does not need the audio — what proves
  things is the words with their timecodes. Audio exists only for an evaluation run, over
  a synthetic corpus with no personal data.
- **Real personal data, by construction.** Patient names are fictitious; NPI and DEA
  numbers are synthesised from their checksums. Recogniser-side redaction is deliberately
  **not** enabled: it forces partial turns off, and the partials are needed for latency
  measurement. Synthetic data on the way in replaces redaction on the way out.
- **The vendor's pre-signed session-artifact URLs.** Only the session id is kept: the links
  are short-lived, and a cached URL an hour later is rubbish that looks like data.
- **The agent's reply audio.** Time-to-first-audio needs the timestamp of the first chunk,
  not the chunk.
- **The system prompt per turn.** It belongs to the session's configuration record, once.

`chooseSessionStore()` refuses to start in production without a blob token, naming the
variable, because this path once failed open: a finished order was written to memory and
lost when the function was torn down while the commit reported success. A lost prescription
reading as a completed one is the worst shape this defect class can take. Development
without a token still gets a memory store, and the escape hatch is explicit.

Demo rehearsals and measured sessions do not share storage. `src/sessions/origin.ts` keys
three prefixes off a required origin field, and an unknown origin defaults to live, never
to measurement, so a missing label cannot inflate a published set.

---

## 5. The agent's system prompt

The prompt that ships is `SYSTEM_PROMPT` in `src/agent/prompt.ts`, and it is the artefact —
read it there. What follows is why it is shaped that way; the text has since grown a
session-identifier section, a two-call read-back protocol and a rule refusing data outside
the field list, none of which changes the principles below.

### 5.1 The construction principles

A page-long prompt costs latency on every turn, because it enters the context at every
inference. So the prompt stays tight and everything that can move into code has moved:

- **The re-ask wording is not duplicated in the prompt.** The gate hands it over in the
  tool result, and the prompt holds only the rule "say what the tool returned". That
  removes half the volume and, more importantly, removes divergence: the logged sentence
  and the heard sentence are one text.
- **The read-back templates stay in the prompt**, because the agent utters those itself,
  before calling the tool, and the caller repeat rate depends directly on their form.
- **Prohibitions are phrased as "never", with no reasons attached.** The reasons are in
  this document, for people. For the model they cost tokens and do not improve behaviour.
- **The prompt is not a protection.** Everything it says about not writing without the gate
  is mechanically guaranteed by the types of section 1. The prompt exists so the agent does
  not spend conversational turns on attempts that would fail anyway — that is, for speed,
  not for safety. A prompt can be broken; an invariant cannot.

### 5.2 Several of the decisions

**The transcript-hint rule stands above the rules about the tools deliberately.** It is the
one place the model can bring down the whole provenance system: a paraphrased hint finds no
match among the words and the field does not pass. The refusal is safe but costs a
conversational turn, so the rule sits where the model's attention is highest.

**"Not a clinician" is about the product's disclaimer, not about model safety.** A
competitor in this field disabled its model's safety filters and shipped no disclaimer at
all; we go the other way, and the agent structurally has no opinion on clinical
appropriateness. This belongs in the prompt and in the README both.

**"One question per turn" is a metric, not a style.** The vendor's own data puts caller
repeat rate an order of magnitude apart between a question about an email address (19%) and
a yes-or-no question (1%) — their numbers. Two questions in one turn reliably produce an
answer to one and a repeat of the other. Since repeat rate is reported broken down by the
agent's question, the prompt has to keep questions atomic or the breakdown means nothing.

**What is deliberately absent.** No list of LASA pairs — it lives in the code, and putting
it in the prompt is exactly the leak of knowledge section 6 is about. No confidence
thresholds — those are the gate's decision. No explanation of why read-back is needed. No
example dialogues: they would add hundreds of words to every turn for a procedure this
simple.

---

## 6. Keyterms: the subtlety that decides whether any of this proves anything

### 6.1 The insight, formalised

`keyterms` on the agent socket and `keyterms_prompt` on the recogniser are biasing: a term
on the list gains an advantage in decoding. Useful — and that is exactly what makes it
dangerous.

The reasoning has to be held in full. The protective construction has two parts, and its
strength is that they are independent: the **recogniser observes** — it produces a
hypothesis and a confidence — while the **validator and the LASA rules check**, comparing
that hypothesis against an external published source. The claim "the gate caught an error"
is meaningful exactly to the extent that the check does not depend on the observation.

Now put both names of a LASA pair into keyterms. The recogniser begins preferring those two
words over any phonetically close alternative. The LASA rule fires more often — not because
it caught anything, but because we nudged the recogniser into producing exactly the words
the rule looks for. "The gate fires on N% of LASA cases" becomes "biasing works", and after
the fact the two effects cannot be separated.

The harm is worse when it is asymmetric. Suppose only one name of a pair reaches keyterms,
because it happened to occur in a test scenario. The human says the other one, and the
recogniser, nudged, returns the listed name at high confidence. **That is exactly the
failure the product promises to prevent, and we would have constructed it ourselves.**

Formally: **keyterms are part of the observation channel; the LASA pairs are part of the
checking channel; the intersection of those two sets must be empty.** The list is built in
`src/lasa/keyterms.ts`, the pairs are `src/lasa/pairs.ts`, and `make keyterms-purity`
refuses a build where the two intersect.

### 6.2 What goes in

Only **identifying context** — words that help the recogniser orient itself in the
situation and take part in no checked rule. The categories, with the reasoning for each:

| Category | Why it is safe, and why it is worth a slot |
|---|---|
| Clinic and pharmacy names | pure identity; affects no order field |
| Prescriber names, fictitious | the same, and dictated at speed |
| Dosage forms | dictated constantly and drawn from a closed set |
| Units of measurement | a unit error is a strength error, and strength is critical |
| Route words | a closed set, and easily confused with one another |
| The functional words of dictation | they frame every field but are never a field value |
| The NATO alphabet | spell-out is the last line before escalation |

The NATO alphabet takes about a quarter of the budget, and that is justified: spell-out is
the last line before escalation, and if the recogniser mishears `Foxtrot` the line does not
hold. Not one of those words is a drug name and not one takes part in any rule.

Part of the budget is deliberately left free for domain context discovered while labelling
the corpus.

### 6.3 What is forbidden

Any drug name occurring in a checked LASA pair — both sides of the pair, in any spelling,
including the FDA's tall-man variants, which normalise to the same forbidden term as their
plain form.

**The ban is wider than the pairs, on purpose. No drug name enters keyterms at all**, not
even one that appears in no pair. The moment a new pair is added, independence would be
quietly lost. The rule "there are no drug names in keyterms" is checkable on its own; the
rule "there are no names from checked pairs" requires two files to be edited in step. We
take the first.

**That is a deliberate sacrifice of recognition quality on exactly the field where biasing
would help most** — the vendor claims a large reduction in errors on medical terms from
promptability, and we give it up on drug names. In its place: the medical model, a domain
prompt containing no concrete names, and the lookup against the built catalogue.

The sacrifice is measurable, and the measurement is quarantined. An A/B of keyterms with
names against without is **not** run as a product choice — only as a separate diagnostic
with an explicit note that the variant with names is methodologically invalid, and that its
figure shows the size of the sacrifice rather than an alternative worth adopting.

### 6.4 The test that has to fail, and the test that keeps it honest

Four assertions, and the fourth is the one it is easiest not to write:

1. **No keyterm is a forbidden name.** The direct check.
2. **No keyterm hides a forbidden name inside it.** "Lisinopril 10 mg" and "take
   Bisoprolol" are multi-word terms with a forbidden name buried in them, and a
   whole-string comparison passes both.
3. **The list fits the documented limit.** `keyterms_prompt` accepts at most 100 terms and,
   per the documentation, **does not error** when given more — terms beyond the hundred are
   ignored silently. That is why the limit is a test rather than a log line: silent
   truncation means part of the biasing does not work while we cannot see it, and the
   degradation gets attributed to recognition.
4. **The pair table is actually loaded.** Break the parse of the source list and assertion
   1 goes green over an empty set of forbidden terms. Requiring a floor on the number of
   forbidden terms turns the green colour into a statement. A check that passes when its
   subject is missing is worse than no check, because it manufactures confidence.

Terms are also required to be unique case-insensitively: a duplicate wastes a slot in a
budget that is spent deliberately.

**On the budget itself.** Multi-word terms count as one, which is why "days supply" is good
value. Singular and plural count as two, and both are needed because both occur in
dictation — expensive, but economising there hits the strength field directly. When the
free slots are gone, the priority on overflow is NATO first, then units, forms and route
words, then the functional words, then prescriber names, and the clinic name goes first,
because it affects no order field at all. Separately: the domain-context `prompt` parameter
has a character limit rather than a term limit, and is a different mechanism from keyterms
entirely.

---

## 7. Metrics: exact definitions

There are no numerical results in this section. The measurements are in
[../eval/REPORT.md](../eval/REPORT.md), each with the command that produced it and the size
of the set it came from, and `tests/scripts/report/honest-report-agreement.test.ts` runs those
commands and requires the printed figures to appear in the report — so a published number
cannot go stale silently.

**Every figure carries its method and its denominator.** A percentage without the size of
the set it came from is not shown at all. That is the rule, and it is the reason this
section defines what counts as an error before anything is measured: once a result exists,
the temptation to shift the definition to fit it does too.

### 7.1 The events timings are computed from

Timings come from these moments and no others. The recorded kinds are `MetricKind` in
`src/domain/session.ts`.

| Moment | Where it comes from |
|---|---|
| caller speech started | the agent socket's speech-started event |
| caller speech stopped | the agent socket's speech-stopped event — **the latency reference point** |
| first partial turn | the first recogniser turn that is not an end of turn |
| final turn | a recogniser turn that is an end of turn and unformatted |
| formatted turn | a recogniser turn that is an end of turn and formatted |
| agent reply started | the reply-started event |
| agent first audio | the **first** reply-audio chunk of that reply — **the latency end point** |
| agent reply done | the reply-done event, with its status |
| tool call received, result queued, result sent | the tool exchange |
| tool results dropped | the queue discarded on an interruption, with how many |
| gate decision | the decision, with its reason code |
| read-back spoken, read-back answered | with the answer classified as confirmed, rejected or unclear |
| socket closed | with the close code |

A dropped-results count is recorded rather than silently cleared. If a barge-in discards
many results, the agent is talking too long before calling a tool, and that should be
visible as a number rather than guessed at.

Three details of the tool exchange are easy to get wrong and all three are load-bearing:
the arguments arrive already parsed as an object, the result goes out as a JSON **string**,
and the queue is discarded only when the reply's status is an interruption — not on every
reply-done.

### 7.2 Entity Error Rate — over turns containing entities, not over words

The denominator is **turns containing entities**, not words and not entities. That
difference from WER is a matter of principle and it is what distinguishes EER in the
vendor's publications, where 15.31% EER sits beside 6.99% WER — their numbers.

- An **entity-bearing turn** is a caller turn for which the corpus ground truth holds at
  least one field value. Turns with no entities — "hello", "yes", "go ahead" — do **not**
  enter the denominator: including them dilutes the metric and makes it incomparable.
- **A turn counts as erroneous** if at least one entity in it was extracted incorrectly. A
  turn, not an entity: two wrong fields in one turn are one error. That is conservative
  towards a smaller figure, it has to be said plainly, and the per-entity definition is
  computed and reported alongside it.

```
EER_turn  = (entity-bearing turns with at least one wrong entity) / (entity-bearing turns)
EER_field = (wrong entities) / (ground-truth entities)
```

Both are reported, each marked with its formula. "EER 12%" without its denominator is a
figure that cannot be compared with anything.

**What "correct" means, fixed per field before any measurement:**

| Field | The comparison |
|---|---|
| drug name | an exact match of the normalised nonproprietary name |
| strength | the numeric value **and** the unit after normalisation; `10 mg` equals `10.0 mg`, and `10 mg` does not equal `10 mcg` |
| dosage form, route | an exact match of the catalogue code |
| quantity, refills, days supply | equality of integers |
| prescriber NPI, prescriber DEA | character-by-character equality |
| sig | an exact match of the normalised form; a difference in word order with the same meaning counts as an **error**, the strict variant, and that is stated rather than assumed |
| patient name | equality after normalising case and whitespace |

**The point of measurement is before the gate.** EER characterises recognition plus
extraction, and the gate must not influence it, so it is computed over first attempts —
what matters is the quality of the first hypothesis. The EER after the gate is a second,
separately labelled figure, and the difference between them is the work the gate did.

### 7.3 Caller repeat rate

A **repeat** is a caller utterance whose normalised text matches the normalised text of
that same caller's previous utterance.

```
repeat_rate = (caller turns repeating the previous caller turn) / (caller turns, excluding the first)
```

The first utterance is excluded from the denominator: it has nothing to repeat.

**Punctuation is replaced by a space, never deleted, and this is not a quibble.** Deleting
punctuation glues tokens together: `12-45-31-95-99` and `1245319599` collapse to one
string, so a caller who really did repeat the number broken into groups stops counting as a
repeat. And the other way: `"ten, twenty"` with the comma deleted becomes `ten twenty`,
which may falsely match a separate utterance. Replacement plus collapsing whitespace
preserves token boundaries in both directions, and a test pins both halves of that.

**Segmentation is mandatory.** An overall repeat rate is useless, because the vendor's own
data spans an order of magnitude from a yes-or-no question to a question about an email
address. So every caller utterance is attributed to the agent's preceding question through
the decision's reason code and field, and the metric is a table of question to rate with
its own count. A cell below the minimum count is marked as insufficient rather than shown
as a percentage, and that minimum is an initial value, not a measurement.

### 7.4 Time-to-first-audio

```
TTFA = (first agent audio chunk) - (caller speech stopped)
```

From the agent socket's speech-stopped event to the first audio chunk of the reply that
followed that utterance. **Not** from reply-started, which comes before the sound and
flatters the figure; **not** from the end of speech per a client-side voice activity
detector, which is not the same as the server's and whose divergence would enter the
metric as noise; and **not** to the end of the reply.

Both timestamps come from one clock. **The network leg to the browser and the time to
decode the audio do not enter TTFA**, and that is stated wherever the figure appears,
because a person in headphones hears the sound later than the number says.

Percentiles are reported as P50, P95 and P99 with the count, the minimum and the maximum.
The interpolation method is fixed in code, because different methods give different P99
values on small samples, and a P99 on a small sample is marked unreliable, because a single
outlier determines it.

The component breakdown, each one a difference of two events from 7.1:

| Component | From | To |
|---|---|---|
| Finalisation delay | caller speech stopped | final turn |
| Formatting delay | final turn | formatted turn |
| Model and tools | final turn | reply started |
| Tool time, per call | tool call received | result queued |
| Speech lead-in | reply started | first audio |
| **TTFA, the total** | caller speech stopped | first audio |

**The components are not obliged to sum to TTFA**, because the stages are partly parallel —
an interactive tool runs while the agent is speaking. That is stated rather than papered
over by fitting the numbers together.

### 7.5 Finalisation delay

```
finalisation_delay = (final turn) - (caller speech stopped)
```

Only an unformatted end-of-turn counts. A formatted turn is a separate metric, because with
formatting on it arrives later, and mixing the two measures two phenomena with one figure.

This metric depends on the endpointing parameters, so the applied recogniser values are
**always** printed alongside it. **A finalisation delay without the endpointing
configuration is a figure about nothing.**

The recogniser keeps both of its silence bounds for exactly this reason, while the agent
socket is sent neither: on the recogniser they widen the window for a dictated entity,
whereas on the agent socket the vendor documents that setting them turns off adaptive
pacing and entity-aware waiting for the rest of the session. The two sockets pull in
opposite directions and do not even share parameter names; treating them as one decision is
how the wrong half gets removed. [assemblyai-api.md](assemblyai-api.md) holds the observed
contract.

### 7.6 The gate's effectiveness: the A/B

The product's central comparison, and it reproduces the vendor's own experiment, in which
adding confirmation steps moved task success from 43.6% to 79.1% — their numbers.

**Task success is defined before the run.** An order counts as successful if it was
committed **and** every field matches ground truth by the comparison rules of 7.2. An order
that was not placed is a failure. A placed order with one wrong field is a failure, not a
partial success: in a pharmacy that is the wrong medicine.

```
task_success = (eval sessions with a committed order and every field correct) / (eval sessions attempted)
delta        = task_success(gate on) - task_success(gate off)
```

Two runs over **the same** audio. With the gate off, the proposal path always accepts, and
the confirmation is recorded as a human override with a service note naming the A/B run.
The invariant is not broken by that and the bypass is not simply left lying in the code: the
off path is reachable only for a session explicitly flagged as a gate-disabled run, and the
HTTP routes cannot set that flag.

Reported with the count of each run and a binomial confidence interval for each proportion.
On a small sample the interval is wide, and that is shown rather than hidden: a large
difference at a small count is significant, a small one is not.

**The secondary cuts answer which of the three re-ask reasons actually works**: the share of
failures caught by a validator, by LASA, and by the confidence threshold. It is entirely
possible the answer is inconvenient — that the LASA branch never fired once. Such a result
is published as it is; it carries more content than any figure fitted to expectation.

### 7.7 False-ask rate — the cost side

The metric it would be easy not to show, which is exactly why it is specified.

A **false ask** is a re-ask on a field where the value proposed **before** the re-ask
already matched ground truth. The gate spent a conversational turn and corrected nothing.

```
false_ask_rate = (re-asks where the candidate value was already correct) / (all re-asks)
```

The denominator is **all re-asks**, not all decisions. It is computable only over an
evaluation run, because in a live conversation the ground truth is unknown — so in live
mode the metrics page shows **not defined**, never zero. `src/sessions/metrics.ts` returns
that refusal with the note attached, rather than a number nobody measured.

**The breakdown by reason code is mandatory, and it is interesting rather than a
formality.** For the LASA branch the false-ask rate will be **high by construction**: the
rule asks whenever a published pair is hit, including every case where the recogniser heard
correctly. That is not a defect of the implementation, it is the price of the construction,
and it has to be named as a number. The wording is prepared in advance: the LASA branch
re-asks in some share of cases where the value was already right, and we consider that
price justified, because the alternative is to let through the homophony that confidence
does not protect against. **To show the cost and call it the price is stronger than to show
task success and hope nobody asks.**

Two derived figures come from the same data: re-asks per completed order, which is how many
turns the gate costs, and the median turns to an order with the gate on and off, which is
how much longer the call lasts.

### 7.8 Held-out discipline

These rules matter more than any metric above, because without them none of the figures is
worth anything.

1. **The corpus is labelled on day 2** and from that moment lies in `eval/heldout/` under a
   digest covering the set. `make seal-heldout` records it; `make heldout-seal` in `verify`
   fails if the set changed afterwards, so the seal is machine-enforced rather than
   remembered. **A populated but unsealed set also fails**: a held-out set nobody sealed
   cannot support a claim about generalisation.
2. **Between labelling and the final evaluation the held-out set is not opened once.** Not
   for debugging, not to look at one file, not for tuning.
3. **Tuning happens on a separate dev set**, generated by the same script with a different
   seed.
4. **The final evaluation is one run at one commit.** The result is written with the commit,
   the policy version and the full configurations sent to the vendor. A second run after a
   code edit is no longer held-out, and if one becomes necessary the report gains an
   explicit entry saying the set was compromised, with both numbers.
5. **What this buys is stated plainly, before the figures rather than after them.** Our
   number will very likely be numerically worse than that of a competitor who tuned on
   their own sample — the case discussed in [case.md](case.md) is a submission reporting
   perfect precision over seventy utterances in which nine patterns had been corrected
   after a divergence from the labelling, and which honestly called itself a regression
   suite rather than an estimate of generalisation. **A worse figure from a held-out set
   means more than a better one without one.**

---

## 8. Open questions

The ones still genuinely undecided. Answered questions have moved into the sections above
or into [findings.md](findings.md).

| The question | The options | The preference |
|---|---|---|
| Whether a later session update that omits the silence bounds restores the agent socket's adaptive pacing | the vendor's wording, "for the rest of the session", suggests it does not; nothing documents it either way | Assume it does not, and never claim otherwise. Confirming it needs a paid run, and until then the guards in `buildAgentDefinition` keep both fields out from session creation |
| The strictness of the sig comparison in EER | an exact match of the normalised form against semantic equivalence | Start strict, and report both figures if the divergence is large |
| Spell-out of a drug name through the NATO alphabet | twelve letters in NATO is long and irritating | Kept, reached only after ordinary re-asks are exhausted; it may be worth replacing with the first three letters only |
| Escalation to a human when there is no human at a hackathon | a flag and a banner against imitating an operator | The flag and the banner. Imitation would be an untruth in the demo |
