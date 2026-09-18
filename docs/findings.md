# What the audits found

Eight audits ran over this codebase after it already passed every check it declares, and
a later cleanup pass found one more. **Not one came back empty.** This file is what they
found, because a defect a team discovers in its own work and publishes is worth more than
one nobody looked for.

Each entry names what was broken, how it was found, and what now keeps it fixed. The
method matters as much as the finding: every one of these was found by **running
something**, and several were invisible to reading the code.

## The voice agent did not speak

`src/audio/playback.ts` held a complete, correct implementation of audio playback
**with no subscriber**. The agent socket dispatched `onReplyAudio` and nothing in
`use-session.ts` listened.

A judge opening the deployed application would have **seen the transcript and heard
silence** — a voice agent that does not speak. Found on the eighth audit rather than
during a demonstration.

This is the seventh instance of one defect class in this project: **a capability that
exists, is advertised, and never runs.** The others were `ForceEndpoint` and
`UpdateConfiguration` on the recogniser client, a read-back reducer reachable only from
tests, an `abortedFields` list nothing read, a `TEST_LIMIT = 30` constant referenced
exactly once — in its own declaration — and a report script with no entry point, so the
command printed as its own method could not run.

The lesson is in how a capability is tested. **A test that a function exists is
worthless.** The test that matters drives the real product path and asserts the frame
arrives: break the subscription and three named tests fail, on audio delivery, on
barge-in and on releasing the audio context.

## The vendor's protection for dictated identifiers was switched off

AssemblyAI documents, verbatim:

> Setting `min_silence` or `max_silence` turns off the adaptive pacing and entity-aware
> waiting described above for the rest of the session.

> When a tool parameter expects a phone number, email, date, or other entity, the agent
> waits for the whole value before ending your turn, instead of jumping in after the
> first pause.

Entity-aware waiting is exactly what protects a dictated NPI or DEA number arriving in
digit groups with a breath between them — **the worst case this product has**, because a
truncated identifier then fails its checksum on a value nobody mis-said.

Both fields were fixed in the stored agent definition, disabling that feature **from
session creation**. Worse, removing them there alone would have achieved nothing: the
per-field patience patch re-sent them on the first field switch of every call.

Both are gone from both places. `vad_threshold` and `interrupt_response` stay, because
neither triggers the disabling. Two guards hold it: the definition builder throws if
either field reappears, and a test asserts their absence from every preset's patch.

**The two sockets pull in opposite directions here**, which is how the wrong half gets
removed. For the recogniser, `min_turn_silence` and `max_turn_silence` *widen* the
window for a dictated entity, so those are still sent. One decision would have been the
wrong decision.

## A finished prescription was written to memory and lost, while the write reported success

`sessionStore()` never consulted the environment. It always returned a memory store, and
the blob-store constructor was dead code no product path called.

In production a finished order went to memory and vanished when the serverless function
was torn down — **and `commitOrder` reported success.** A lost prescription reading as a
completed one is the worst shape this class of defect can take in this domain.

Storage now fails closed: production without a blob token refuses to start and names the
missing variable, and a whitespace-only token counts as absent rather than as configured.
Development without a token still gets memory, because needing a blob token to run the
dev server would be its own defect.

## A page a judge reads carried a number nobody measured

The limits page claimed "roughly 960 pairs extracted from the published list."

Nobody computed 960. Worse, the wording implied the ECRI list had been **parsed**, when
the build actually falls back to a hand-curated table because that source left its stable
URL. The page claimed work that did not happen.

It now states the real mechanism and reads its count from `LASA_PAIRS.length` rather than
a literal — **twenty pairs**, which is what ships.

## A published measurement had gone stale, and nothing was comparing it

`make honest` reproduces thirteen offline measurements, each with the command that
produced it. **Nothing compared its output to what the documents claimed.**

So a figure could drift silently, and one had: the calibration table published 92.9%
over 80 utterances while the script, after a third corpus joined the pooling set, printed
**89.7% over 120**. Both figures were honestly produced. One was months out of date.

Two more of the same shape: the held-out three-stratum table had **no command at all**
behind it, and the coverage section described a three-stage method the code had collapsed
into two.

A test now runs each anchored step's real command and requires its printed figures to
appear in the report. Anchor the **measured values**, not only the set size — an anchor on
"120 recorded utterances" alone let a wrong percentage through, found by mutating the
published number and watching the test pass.

## 22.6 kB of a package nobody could reach shipped to the browser

`src/audio/resample.ts` called `Buffer.from` as a fallback after an already-working
`btoa` check. That branch never executes in any runtime this file reaches — the browser
always has `btoa`, and so does the test environment.

But a bundler cannot prove that statically, so it pulled the entire `buffer` package into
the client bundle. Removing two branches dropped the home route from 152 kB to **145 kB**.

## The reduced-motion setting was respected one frame late

`useReducedMotion()` initialised to `false` and read the real setting inside an effect.
Four components decide whether to apply an animation class **during render**, so a viewer
who asked for no motion saw one animated frame before the effect corrected it.

Fixed with a lazy initialiser that reads the media query synchronously. The test uses
static rendering, which never runs effects — the ordinary render helper flushes them and
would have masked the bug entirely.

## Three different re-ask reasons moved identically

Measuring `getAnimations()` showed the three refusal reasons playing **the same
animation**, distinguished only by colour.

That undercuts the product's central claim. A look-alike pair fires **despite** signal
strength; the other two fire **because of** its weakness. A decision of a different kind
that looks the same is an interface arguing against its own product.

The pair case now carries its own duration and keyframes with a mid-point hold. Three
further dead animations were found the same way — React reusing a DOM node when nothing
tracked what changed, so a class swap never restarted the animation. Reading the
stylesheet would have missed every one.

## A banned pattern came back because nothing kept it out

A coloured left border used as a decorative accent stripe was removed once by hand. It
**reappeared in two new components**.

The lesson is not about that pattern: **any rule stated in a document and enforced by no
script will be broken by the next person who has not read the document.** A test now scans
every stylesheet and permits exactly one hairline exception, named.

The same rule had already drifted twice for touch targets, before a check existed.

## Our own checks were green while checking nothing

The most uncomfortable findings are these, because this project's central claim is that a
guarantee must be mechanical.

**The invariant check was bypassable.** A confirmed value cannot be constructed outside
the gate; the check enforced that by scanning for one of TypeScript's **two** assertion
syntaxes. A file using the older form forged a value while the linter, the type checker
and the invariant check were **all three green at once**.

**The secrets check excluded a directory name, not a directory.** It used
`--exclude-dir=api`, which excludes any directory called `api` at any depth, so a file at
`src/features/api/leak.ts` could read the API key and pass.

**The token check suppressed its own output for every file.** Under `set -o pipefail`,
the `||` in `grep … | sed … || true` binds to `sed`, so a non-matching `grep` killed the
pipeline and `|| true` swallowed the failure. It reported success while examining nothing,
and a raw colour literal lived in a component for an unknown period.

**The meta-test could not fail.** The test that names any ratchet lacking a positive
control asserted a quantity against itself. With it passing, the repository claimed every
ratchet was guarded while **two of twenty** actually were. There are eleven now, plus five
excluded by name with a stated reason each.

**A declared limit did not exist.** A constant setting the test-file limit per directory
was referenced exactly once, in its own declaration. The rule the documentation described
as enforced was not enforced.

**The touch-target check was wrong twice.** The first version asked whether a stylesheet
*mentioned* the size token anywhere, and passed a 28 px link. The second parsed every
height declaration and still passed a 28.6 px brand link, because that control declared no
height at all while a sibling selector cleared the floor. The third requires every
standalone interactive class to reach the floor itself.

Getting that third version right produced **six false positives** on the first attempt,
which is the other half of the lesson: **a check that cries wolf is abandoned faster than
a check that sleeps.** Both failure directions have to be tested — plant the violation and
watch it fail, then run the whole tree and watch it stay quiet.

## A green suite that reported a failure

The full verification exited non-zero while printing **1377 of 1377 tests passed** — the
suite size on the day, since changed. The cause was an IPC timeout, not a failed
assertion, and the source was the positive controls:
each runs its script three times, and one took 9.8 seconds per run because it spawned a
subprocess per directory. Replacing that with shell parameter expansion brought it to
0.47 s and the phantom failure went with it.

Three checks were ultimately sped up the same way: 38 s to 1.2 s, 17 s to 0.6 s, 9.8 s to
0.47 s. **On Windows, a subprocess per file is the default cause of a slow check**, and the
second-order cost is a team that spends a day chasing flakes which are really timeouts.

Separately, the suite runs **without file parallelism on purpose**, costing about 90
seconds. The positive controls plant a violating file inside the source tree — they must,
because the checks they exercise scan that tree, and a control planting anywhere else would
prove nothing about the real configuration. While those files exist, any other test walking
the tree sees them. Measured over three runs the suite failed 2, 0 and 1 of 1377
assertions, always in a tree-walking test, never the same one twice. **A verification that
fails once in three runs teaches everyone to re-run it, which is how a real failure gets
waved through.**

## The fixtures were described as recorded and were synthesised

`README.md` stated that the socket traffic in `eval/fixtures/` was "recorded from a live
run and never hand-written". It was not. All eight fixtures carry the same `recordedAt`
timestamp to the millisecond and a `sessionId` of `fixture-<name>`, because a generator
builds them from the documented message shapes.

The generator is honest about it — its last two lines print that the fixtures are
synthesised and must be re-recorded before any published number depends on them. **Nothing
ever printed those lines**, because the script had no entry in the `Makefile` and no
importer, so it ran only when someone invoked it by hand, which nobody did.

That is the same defect class as the silent agent, one step removed: not a capability that
never runs, but a **warning** that never runs. A caveat is only as good as the path that
reaches it. `make fixtures` now exists, and the README says synthesised.

What this costs is bounded and worth stating: the fixtures exercise provenance matching,
the validators, the pair table and the gate against message shapes taken from the vendor's
documentation. They do not prove those shapes are what the sockets actually send. Every
figure in `eval/REPORT.md` comes from live sockets instead, which is why the correction
changes the README and no measurement.

## A hundred exports nobody read, and two error classes nobody throws

A dead-code pass over the whole tree found **98 unused exports and 24 unused exported
types**. Almost none were dead entities — they were internal constants and helpers
carrying an `export` nobody needed, which is how a module's real surface becomes
impossible to read. Ninety-seven lost the modifier and ten declarations went entirely.

Four of those ten are worth naming, because each was a decision recorded only by being
unreachable:

- `truncateToLimit`, the sole implementation of clipping a tool response to the vendor's
  8 KiB. The product path **refuses** an oversized payload with a stated reason instead,
  which is the better answer in this domain: a silently truncated JSON response is one
  the agent can misread, and a refusal cannot be misread.
- `setSessionStore`, a runtime setter for the session store. The tests inject through a
  parameter instead, and a setter able to swap the store at runtime would be a way past
  the fail-closed logic that exists because that store once lost a finished order.
- `CLOSE_CODE_MEANINGS`, a second copy of close-code text. The product path reads
  `explainClose`, so the duplicate could only ever drift out of agreement with it.
- `bandCaveat`, a sentence qualifying a confidence interval, published nowhere.

Two error classes in `src/domain/` are **declared and never thrown**: `NormalizationError`
and `UpstreamError`. They are left in place rather than deleted, because that directory is
the contract between the two halves of the project and removing from it is the owner's
call, not a cleanup's. But they are leftovers of an earlier model: a normalisation failure
is not an exception here, it is a **reason to re-ask**, returned as a value and read by the
gate as one of its branches. Recording that is the point — an unthrown error class is a
design decision whose only trace is that nothing reaches it.

## What the audits could not verify, stated

No screen reader was available, so everything described as announced is verified through
the accessibility tree and the DOM, never through heard speech. Live-session panels that
mount only with an open microphone were verified through rendered DOM and mutation testing
rather than a live call. Whether a later session update restores the vendor's entity-aware
waiting is **not documented** and is not claimed; confirming it needs a paid run.
