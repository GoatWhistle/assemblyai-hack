# Limitations

> Everything this project cannot prove, in one file, at full strength. The gate proves that a
> value traces to words the session reported and passed a validator or a spoken
> confirmation; it does not prove that a person said those words, and a hostile client can
> fabricate them. The evidence behind every figure is synthesised speech, and the live calls
> that reached a committed order on production used a synthesised caller, not a human voice.

**Read this if** you are deciding how far to trust a result, or looking for the weakest point
before someone else finds it · **Related:** [evidence](evidence.md) ·
[security](security.md) · [design decisions](design-decisions.md) · [sources](sources.md) ·
[eval/REPORT.md](../eval/REPORT.md)

Each entry carries a status from the vocabulary in [evidence](evidence.md#how-is-each-claim-graded).
Every heading below also appears on the site at `/docs/limitations`.

---

## The evidentiary chain does not survive a hostile client

**Status: False, and stated as false.**

Provenance is computed in the browser. The browser holds the AssemblyAI streaming socket
directly, so `words[]` with its timings and per-word confidences never passes through our
server; the client posts it to `POST /api/sessions/{id}/turns`, which is deliberately
unauthenticated, because a browser cannot hold the shared tool secret without publishing it.

Stated at full strength: **anyone with DevTools can post arbitrary words with arbitrary
timings and arbitrary confidences, and the gate will accept a value carrying that
provenance.** The gate verifies that a value traces to words the session reported. It does
not, and cannot, verify that those words were spoken. The gate is built to stop a recognizer
from quietly mishearing a drug name, not a caller deceiving themselves; in the
malicious-client threat model the chain is worth nothing. The route enforces resource bounds
instead of a secret, listed in
[security](security.md#provenance-is-client-supplied-so-the-gate-proves-provenance-not-truth).

### What the vendor witness adds, and where it stops

At finalize the server fetches the agent socket's own transcript from AssemblyAI with its own
key and seals a `witnessed`, `not_witnessed` or `unavailable` verdict for every written field
into the receipt ([security](security.md#a-second-channel-witnesses-the-words-after-the-call)).
A browser that forges its turns cannot forge the vendor's record. Two boundaries: the
timeline appears only seconds after the session ends, so the witness cannot block a commit
during the call; and it proves the vendor heard the words, not that a person rather than a
client sending synthesised speech to both sockets said them.

### The alternative, and what it costs

Relaying audio through our own backend is the correct fix, and at least one other team in
this field made exactly that choice, arguing that *an untrusted browser must not be the
authority on what was committed.* We agree with the sentence and did not follow it.

Routing audio server-side means an always-on host. Vercel caps a function at 300 s on the
Hobby tier while these sessions run two to ten minutes, so the relay cannot be a function; it
becomes a process, a second deployment target, and a second thing that can be down during a
demo. That is a deployment argument, not a trust argument, and it does not answer theirs.

What the choice keeps is granularity. The team that relays audio reports resolution *per
clause*, with character offsets interpolated across the clause, because their speech provider
returns no character alignment. Our provenance is genuine `words[]` with per-word millisecond
start and end times and a per-word confidence, straight from the recognizer.

The trade has a named direction: we hold **finer-grained evidence that a hostile client could
fabricate**, they hold **coarser-grained evidence that a hostile client could not**. For the
failure this product exists to catch, a recognizer mishearing a drug name while reporting high
confidence, per-word timings and confidences are the input the gate needs. For an audit trail
that must hold up against the person who created it, their choice is the right one and ours is
not.

The vendor's session record returns turn-level timings (`time_to_first_audio_ms`) and
tool-call timings, not word-level ones, so word-to-gate latency could only be a browser
measurement, and it is not measured.

## A caller who corrects themselves inside one utterance is detected only through six markers

**Status: Enforced by tests for the six markers; the gap is narrowed, not closed.**

If someone says "Lisinopril, no wait, Losartan", the server refuses lisinopril as a value the
caller took back: reconciling the proposed value against the words of its turn fails
`spoken_support` with `E_RETRACTED_VALUE`, and `propose_field` answers `E_VALIDATOR_COMBO`.
That is the second reason to re-ask, not a fourth. Losartan, the value the caller settled on,
goes on to its own checks.

The markers are "no wait", "sorry", "I mean", "actually", "scratch that" and "not X, Y", and
the replacement has to follow within four words
([`src/confirmation/self-correction.ts`](../src/confirmation/self-correction.ts)).
`tests/confirmation/self-correction.test.ts` pins each marker, a number corrected by a
number, and the phrases that must not fire: "lisinopril, not losartan", "lisinopril sorry
about that", a "sorry" followed by a value of another field, and a value said again after its
own correction. `tests/api/self-correction.test.ts` drives the same through the tool route.

Not detected: a correction without one of these markers, such as a pause and a different
name; a correction spread across two turns; and markers in other words ("rather", "make
that"). There the read-back is the mitigation. The provenance matcher still finds a span for
the retracted word, because it was said, and the refusal is spoken support's. Four tests in
`tests/confirmation/retracted-span.test.ts` pin that provenance side.

## The pair rule covers the 2023 ISMP list and nothing else

**Status: Measured.**

The rule, `lasaRiskFor`, checks every pair of the ISMP List of Confused Drug Names, updated
through February 2023: 514 pairs over 754 names in `data/lasa-pairs.json`, which records the
source URL and the PDF's sha256. The curated table in
[`src/lasa/pairs.ts`](../src/lasa/pairs.ts) holds 20 pairs, each checked by hand against its
row; it is the core of the demo and of the evaluation corpora. Both counts come from
`npx tsx scripts/measure/ismp-coverage.ts`; the coverage method is in
[evidence](evidence.md#how-much-of-the-published-list-does-the-rule-cover).

**A published list only catches the pairs it publishes.** Lisinopril misheard as bisoprolol is
AssemblyAI's own example of the failure this product exists for, and it is on no list we have
found, the full 2023 ISMP list included. The gate would not re-ask it on the pair rule: it
would pass on confidence and a valid catalogue entry, and only the plain read-back, which a
reflex "yes" passes, would stand between it and the order. A pair we derive ourselves is never
added.

A newer edition of the list means rebuilding with `make data`; `scripts/build/lasa.ts` refuses
to overwrite the snapshot when a parse falls below its 40-pair floor. A brand name is recognised
only when the catalogue lists it under `proprietaryNames`. The rule has a price, from the same
command: 502 of 3730 catalogue drugs carry a listed name, and 21 of the 59 correct values of
the control corpus get a contrastive question.

## The evaluation corpus is synthesised

**Status: Measured against synthetic speech, and labelled everywhere.**

We found no open English corpus of human speech reading drug names. Entity Error Rate in
[eval/REPORT.md](../eval/REPORT.md) measures the live recognizer against speech from a desktop
speech synthesiser: synthetic audio, real recognition. Every figure derived from it inherits
that boundary.

### The confident mishearing the product is built around has not been observed

Every listed name in our synthesised corpora was re-recognized live through a telephone band,
white noise at 10 and 5 dB and a speed-up: 188 utterances, 186 of them scored (two sessions
closed on a transport error, 1006 and 1008, and are excluded rather than counted as
mishearings). None came back as its published partner, and none of the 18 errors reached the
0.95 threshold (`npx tsx scripts/measure/analyse-stress.ts`). Some did become other real
drugs (azacitidine as azithromycin, silodosin as thalidomide), which is the shape of the
error, one step short. The replay that shows hydromorphone heard as morphine at 1.00 is
staged and labelled so. The pair rule rests on the published list and on people mishearing
these names, not on our corpus.

### Live calls on production used a synthesised caller

**Status: Observed.** The production live runs in `eval/live/runs.json` drive a real browser
(Firefox, `--project firefox-fake-caller`) against the production deployment, with both real
AssemblyAI sockets, the vendor's recognizer and managed language model, our server, the gate
and the order store. The caller is synthesised: prepared speech injected into the page's
microphone track through WebAudio, with the answer to each agent question chosen by a regular
expression over the agent's own words (`tests/live/responder.ts`). No human spoke and no
microphone was used.

On production `clean-order`, `lasa-named` and `commit-hold` committed their orders, and
`yeah-no`, `barge-in` and `npi-groups` completed: each scenario has one passing run. The
scenario table, with every billed and refused attempt, is in
[eval/REPORT.md](../eval/REPORT.md#live-runs-on-production).
`.github/workflows/live-smoke.yml` runs the same calls against a deployed URL on demand.

### What is deliberately not measured

| Not measured | Reason |
|---|---|
| Accuracy on human speech | No open corpus found; the synthetic figure carries that label |
| A live call with a human voice | Not run; every live call used a synthesised caller |
| NPI existence in the live registry | Our NPIs are synthetic, built to pass the checksum; the registry would answer "not found" and add only noise |
| Threshold optima | Thresholds are chosen defaults; see the next section |
| Keyterms including drug names | Biases the recognizer toward the strings the rules check; at most a diagnostic of the cost, never a configuration |
| Word-to-gate latency | Word timings never reach the server; it would be a browser measurement |
| Market size in money | Not estimated; a figure we cannot source is exactly what this project refuses to publish |

## Thresholds are chosen defaults, not measured optima

**Status: Assumption, not result, stated at the head of the report.**

Every threshold in `eval/REPORT.md` is a chosen default, reasoned from the cost of an error in
each field before any audio existed. None was tuned on any set. The held-out set was sealed
before it was opened, `make heldout-seal` fails if it changes, and it has been opened once.

## Our own pre-registered hypothesis failed

**Status: Assumption, not result: not supported, published anyway.**

We predicted that rare drug names would be measurably harder to recognise than common ones.
The prediction, the decision rule and the falsification condition are in
[`eval/heldout-preregistration.md`](../eval/heldout-preregistration.md), written before the
held-out audio existed. The rule required non-overlapping 95% Wilson intervals between the
rare and common strata.

They overlap heavily, and the rare and mid strata are identical at 30.0% each
(`npx tsx scripts/measure/analyse-rarity.ts --set eval/heldout --strata 3`). The control
corpus suggests 43.8% against 16.7% (`npx tsx scripts/measure/analyse-rarity.ts --set
eval/control`); that gap does not replicate and on the evidence is sampling noise in a set of
forty. The negative result stays in the report, because a sealed set can be opened only once
and dropping a failed pre-registered hypothesis is what makes published benchmarks
untrustworthy.

What does replicate is the part the product rests on: an overall entity error rate of 26.7%
[17.1%, 39.0%] on the held-out set against 27.5% on the control corpus. Four of sixteen
scored held-out errors sit at or above the 0.95 threshold; two of those four are misspellings
in the spoken form our sampler drew from the FDA catalogue, so two genuine recognizer errors
(`oteseconazole`, `chlorthalidone`) would have passed a threshold alone and been written into
an order by a confidence check.

## Two guarantees rest on checks reading the tree correctly

**Status: Enforced; each forgery is planted by a test that requires the check to fail.**

- **The gate invariant.** TypeScript can assert a type in more than one way. `make
  gate-invariant` fails on `as ConfirmedValue` or `<ConfirmedValue>` anywhere but
  `src/gate/confirm.ts`, on any `as unknown as` or type-checker suppression in product code,
  and on the disappearance of the one assertion inside `confirm.ts`
  ([verification](verification.md#one-constructor-for-a-confirmed-value)). A check that
  scanned for one syntax would pass a forged value while the linter and the type checker were
  green too.
- **The key boundary.** `make secrets` allows `ASSEMBLYAI_API_KEY` only under the path
  `app/api/`, not in any directory merely named `api`, fails if no file there names it, and,
  when a build is present, fails if a server secret's name appears under `.next/static`
  ([verification](verification.md#the-secrets-check-reads-the-built-bundle)).

The residual risk is the class, not these instances: a check that passes when the thing it
checks is missing is worse than no check, because it produces confidence. Every ratchet in
`VERIFY_STEPS` either has a positive control in
`tests/scripts/ratchet-positive-control.test.ts`, which plants a violation and requires the
check to fail, or is excluded there by name with a stated reason
([verification](verification.md#every-ratchet-is-proved-to-bite)).

## Known security weaknesses left open

**Status: Assumption, not result: each is defensible for a demonstration on synthetic data
and none would be for real orders.**

Ten known weaknesses of low severity are open:

- **A session id is a bearer capability.** Whoever holds one can post turns to it, finalize
  it and mint a reconnect token for it. Ids are random UUIDs, never listed by any route, and
  reach only the owning browser and the `/order/{id}` link after a commit.
- **Unknown session ids cost storage listings.** A lookup of an id that was never stored
  makes up to three Blob `list` calls; it is anonymous and repeatable.
- **Finalize trusts an explicit `?origin=`.** A missing or unknown label still defaults to
  `live`, so nothing inflates a measured set by accident, but the session's holder can label
  it on purpose.
- **A misconfigured tool secret is named in the 401.** A wrong secret gets the generic
  message; only a deployment with no secret, or one too short, says so.
- **The agent's own hint is quoted back in `say_to_caller`.** The prompt marks tool results as
  untrusted data, so this is a spoken echo, not an instruction channel.
- **Store errors reach the client as text.** A Redis error reply appears in the 503 body; a
  test pins that no token or URL is ever included.
- **Bodies are parsed before bounds.** Size is limited by the platform, not by us; tool
  routes authenticate first, `/turns` and `/api/demo/run` are public.
- **`/api/metrics` is uncached,** so every view re-reads every stored session it counts.
- **Blob objects are public**, and the UUID in the path is the only secret.
- **Six dependency advisories remain** under `npm audit --omit=dev`, four high and two
  moderate. Four sit in `next` 15 and its `postcss`, and in `@vercel/blob` 1.x and its
  `undici`, each fixed only by a major-version upgrade that has not been made. Two sit in
  Playwright, a test dependency the audit counts because `next` declares it as an optional
  peer.

## Close codes are observations, not specification

**Status: Observed; the vendor documents none.**

AssemblyAI's streaming API reference documents **no WebSocket close codes at all**. Every
entry in [`src/realtime/close-codes.ts`](../src/realtime/close-codes.ts) is therefore an
observation, and each records whose. We measured 1000 and 1008 ourselves, and 1006 once; 1008
is what the rate limiter actually sends, and 3009, which vendor prose names for that
condition, has never been observed. 3006 comes from another team's measurement. 3007, 3008 and
3009 come from vendor prose rather than from a close-code table. None of them may be presented
to a reviewer as specification.

## Voice audio leaves this application and goes to a third-party vendor

**Status: Cited for the endpoints; the vendor's retention terms are not verified.**

Both AssemblyAI sockets are held directly by the browser, so the caller's voice is streamed
to `wss://streaming.assemblyai.com`, the global recognizer endpoint, and to
`wss://agents.us.assemblyai.com`, the voice agent's US region. The agent is pinned to one
region for a functional reason, not a data-residency one: stored agents live in one region,
and the unqualified host sends a US server and a European browser to two different stores
([`src/domain/live/agent-region.ts`](../src/domain/live/agent-region.ts)). So the agent audio
of every caller, wherever they are, goes to the US region. No data-residency choice was made
or evaluated for either socket, and the EU endpoints are not used.

What AssemblyAI retains from a session, for how long, and under what policy is governed by
AssemblyAI's own terms and privacy policy, not by this repository. We have not summarised
their retention terms, because an unverified summary would be exactly the kind of unsourced
claim this project refuses to publish. Consent to sending the voice to AssemblyAI is implied
by using the application; no consent screen names the vendor or links its policy before a
session starts. All data in this project's own demonstrations and evaluation runs is
synthetic, so this limitation concerns real use of the application, not anything published in
`eval/REPORT.md`.

## In a real emergency, do not use this application

**Status: Disclaimer, with an action rather than only a refusal.**

If something is wrong right now, such as an allergic reaction, a medication error already
taken, or any symptom that feels like an emergency, **call 911, or 988 for a mental health
crisis, immediately.** This application does not call emergency services, does not triage
symptoms, and nothing in its design routes an emergency to a human faster than a phone
would.

The instruction appears on the site's limitations page. The shared disclaimer shown on every
page (`DISCLAIMER_BODY` in
[`src/shared/ui/states/disclaimer/index.tsx`](../src/shared/ui/states/disclaimer/index.tsx))
states what the project is not, and does not carry the emergency numbers.

## This is not a medical device

**Status: Disclaimer.**

A technology demonstration. All data is synthetic: no real patients, no real prescriptions,
no clinical use, no claim of regulatory approval or review.

This project quotes ISMP, the FDA, the Joint Commission and 21 CFR. It is **not affiliated
with, endorsed by, or reviewed by any of them.** The citations establish that read-back is an
existing requirement; they establish nothing about this software.

Do not enter real patient data into this application.

## The regulatory citations, and what we have not sourced about them

**Status: Cited by clause number, without a penalty figure.**

The exact wording of each clause is quoted in [sources](sources.md#what-requires-read-back).
What each citation does not establish:

- **ICAO Annex 11, §3.7.3.1 and §3.7.3.1.2** govern flight crews and controllers, not
  prescription intake. They are cited because medicine's read-back requirement comes from
  aviation practice, not because this project is subject to them.
- **Joint Commission NPSG.02.01.01**, a National Patient Safety Goal since 2003, is the clause
  that applies most directly to the domain this project simulates. ISMP placed it at
  PC.02.01.03 EP 20 in 2017; its 2026 location is not verified.
- **21 CFR 1306.12(a)** prohibits refilling a Schedule II prescription. The gate refuses a
  Schedule II order with refills and cites the clause in its reason
  ([`src/domain/verdict.ts`](../src/domain/verdict.ts)). It is the one controlled-substance
  rule implemented; state rules vary by jurisdiction and are deliberately absent.

**No penalty or sanction figure is published for any of the three.** We have not located a
current civil-penalty or licensure-sanction figure for a Joint Commission NPSG lapse or a
21 CFR 1306.12(a) violation that we can verify against a primary source, and a
frightening-sounding penalty number would be the easiest thing in this section to write
without checking. A reader who needs the current penalty schedule belongs at the regulator's
own published material.

---

<p align="center"><sub><a href="README.md">Documentation index</a> · <a href="../README.md">Project README</a></sub></p>