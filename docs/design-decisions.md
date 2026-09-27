# Design decisions and the failures they guard against

> The rules below are the ones no other page states: each with the failure it prevents, the
> test or check that fails if it is broken, and what it still does not cover. Most of these
> failures come from a mechanism that is correct on its own while nothing checks that it agrees
> with its neighbour: a field name and its candidate, a confidence and its absence, a runtime
> file and the bundle that must carry it. Rules already explained elsewhere are linked, not
> repeated.

**Read this if** you are changing the tool routes, the audio path, storage or the checks ·
**Related:** [architecture](architecture.md) · [specification](specification.md) ·
[security](security.md) · [verification](verification.md) · [limitations](limitations.md)

---

## Where the other rules live

| Subject | Page |
|---|---|
| The gate branches, a checksum-proved value written at proposal, spoken-value reconciliation, the `commit_order` contract and its combination re-check, an early submit sent to the hold | [specification](specification.md) |
| Agent playback, the four echo layers, half-duplex from the first reply audio, silence bounds per socket, token header shapes, the pinned agent region, the managed model | [architecture](architecture.md) |
| Storage failing closed, the three origin prefixes, the 8 KiB tool response limit | [security](security.md) |
| The gate invariant, gate mutation testing, positive controls, serialized tests, figures compared with their commands | [verification](verification.md) |
| Where each curated LASA pair is cited, and why the pair counts are read from code | [evidence](evidence.md) |

## How can a value arrive under the wrong name or on no evidence?

| Rule | Failure it prevents | Enforced by | Residual limit |
|---|---|---|---|
| A `read_back` whose field name disagrees with the candidate's own field is refused (`field_mismatch`); the payload reports the candidate's field | A value confirmed under one field's laxer policy while the write lands under another, and the audit record names the first | `tests/api/field-name-closed-list.test.ts`, "refuses a read_back whose field disagrees with the candidate it names" | Both names come from a closed list, so only the comparison sees the mismatch |
| `makeProvenance` and the turn store refuse a non-finite or out-of-range confidence, refusing the whole turn and naming the word | An unscored word passing as a high-confidence one | `tests/api/unscored-confidence.test.ts` | Confidence is client-supplied ([limitations](limitations.md#the-evidentiary-chain-does-not-survive-a-hostile-client)) |

The guard sits upstream of the gate on purpose: `NaN < threshold` is false, so an unscored
word would skip the low-confidence branch and be accepted as `A_VALIDATOR_PASSED_HIGH_CONF`.
A test builds that provenance and shows what the gate alone would return. Adding a fourth
re-ask reason inside `decide()` to catch it would break the rule of exactly three.

## What keeps the call from stalling on the audio path?

| Rule | Failure it prevents | Enforced by |
|---|---|---|
| When the first reply audio mutes the recognizer, the browser sends `ForceEndpoint` | The mute stopping audio mid-turn, so the recognizer never closes the caller's turn and the server refuses every proposal as untraceable | `tests/features/patience-wiring.test.tsx`, "sends ForceEndpoint when the agent becomes audible" |
| A reply that streams no audio for 20 s without `reply.done` releases half-duplex and shows the `reply_stalled` fault | A reply that dies mid-way leaving the microphone muted for the rest of the call | `REPLY_STALL_MS` in `src/features/intake/session-timers.ts`; `tests/features/intake/reply-watchdog.test.ts` |
| Loading the capture worklet times out after ten seconds into a named fault, and both sockets are ended | A capture that never starts leaving the call on its start-up status while two sockets bill | `WORKLET_LOAD_TIMEOUT_MS` in `src/audio/microphone.ts`; `tests/audio/capture-module-timeout.test.ts` |

## What does the vendor API require that its documentation does not say?

These are live behaviours of the AssemblyAI API that the code follows. They are
**Observed**, not specification.

| Rule | Why | Enforced by |
|---|---|---|
| Tool headers are sent as a list of `{ name, value }` | The create-agent API answers 422 to an object, so no agent could be created | `tests/agent/definition.test.ts` |
| A `session.update` for a stored agent carries `{ agent_id }` alone | Sent with any other session field, it is answered `agent_id is mutually exclusive with other session fields` and closed with 1008 | `tests/realtime/agent-token-binding.test.ts` |

## What keeps development and production from disagreeing?

| Rule | Failure it prevents | Enforced by | Residual limit |
|---|---|---|---|
| In-memory stores live once per process on `globalThis` (`processSingleton`), not once per route bundle | `next dev` bundles each route separately, so the token route and `/turns` would each see their own session registry | `src/sessions/process-memory.ts`; `tests/sessions/process-memory.test.ts` | Matters only where a store is held in memory, which production does not allow ([security](security.md#storage-fails-closed)) |
| The session store is chosen once per process by `chooseSessionStore()` | A store swapped at runtime getting past the fail-closed choice | `sessionStore()` in `src/sessions/blob-store.ts` | `installSessionStore()` is exported for tests; no product path calls it, and no check forbids one |
| Every runtime data file is traced into the serverless functions (`outputFileTracingIncludes` in `next.config.ts`) | A `readFileSync` path the bundler cannot see, so every catalogue lookup answers 500 in production while passing locally | `tests/scripts/server-data-tracing.test.ts` | |

## How do the checks avoid passing while checking nothing?

[Verification](verification.md) describes every check and the positive control that proves
it bites. The rules below explain choices in how the checks themselves are built.

| Rule | Failure it prevents | Enforced by |
|---|---|---|
| The mutation runner reads and writes the gate without newline translation, runs vitest with colour disabled (`NO_COLOR`, `--no-color`), reads the named test's verdict from the JSON reporter, and records its own pid in its lock | CRLF translation on Windows breaking the byte-for-byte restore; colour codes or reporter formatting hiding a test name; a stale lock blocking every later run | `scripts/checks/gate-mutation.sh`, `scripts/checks/named-test-verdict.mjs` |
| Checks that walk the tree are Node scripts or use shell parameter expansion, not a subprocess per file | On Windows a subprocess per file makes a check slow enough to trip the test runner's IPC timeout, which reports a failure no assertion made | Convention; no check enforces it |
| `make touch-targets` requires every standalone interactive class, one that declares its own `display`, to reach the floor itself; pure modifiers are skipped | Passing a control that declares no height because a sibling selector clears the floor; false positives on modifiers that carry only colour | `scripts/checks/touch-targets.mjs`, with a positive control; the whole tree must stay quiet |
| No coloured side stripe (`border-left` or `border-right`) as an accent on prose, with one named hairline exception | A visual rule enforced by no script returning with the next component | `tests/shared/no-side-stripe.test.ts` |

A check that raises false alarms gets ignored as surely as one that never fires, so
`touch-targets` is tested in both directions.

## How does the interface keep the pair rule distinct?

| Rule | Failure it prevents | Enforced by |
|---|---|---|
| The pair-rule refusal has its own animation (`--keyframes-verdict-emphatic`), distinct from the low-confidence and validator refusals | Refusals of different kinds looking alike: the pair rule fires despite a strong signal, the other two because of a weak one | `src/features/field-card/lasa-override/` and the gate banner; verified in a browser, since tests stub CSS |
| Reduced motion is read synchronously during render (`useSyncExternalStore`) | A component that picks its animation class during render showing one animated frame before an effect corrects it | `src/shared/ui/motion/use-reduced-motion.ts` |

## What is synthesised, and how does that stay visible?

The socket traffic in `eval/fixtures/` is synthesised by `scripts/build/fixtures.ts` from the
documented message shapes: every socket fixture carries the same `recordedAt` and a
`sessionId` of `fixture-<name>`. `make fixtures` runs the generator, which prints that the
fixtures are synthesised and must be re-recorded before a published number depends on them.

The fixtures exercise provenance matching, the validators, the pair table and the gate; they
do not prove the shapes are what the sockets send. The recognizer figures in
[eval/REPORT.md](../eval/REPORT.md) come from live sockets. The gate's own decision time is the
one published figure a fixture feeds, and the A/B table in the report uses assigned
confidences; both say so there.

## What is not verified?

No screen reader has been used, so everything described as announced is verified through the
accessibility tree and the DOM, never through heard speech. Panels that mount only with an
open microphone are verified through rendered DOM in tests and with the synthesised caller of
the live runs, not with a human voice.

---

<p align="center"><sub><a href="README.md">Documentation index</a> · <a href="../README.md">Project README</a></sub></p>