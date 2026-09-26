# Cost and budget

> What a live session costs, what caps the spend, and which commands pay. A session holds two
> sockets that bill at the same time, **$5.10 an hour**, and billing runs on the time a socket
> is open, not on the audio sent. Tests never pay; the deployed app debits a shared daily
> budget before it mints a token; spend is published only from the recorded ledger.

**Read this if** you are about to run a paid command, deploy the app, or quote a cost ·
**Related:** [architecture](architecture.md) · [security](security.md) ·
[limitations](limitations.md) · [sources](sources.md)

---

## What does a minute cost?

Rates as of **17.09.2026**, from <https://www.assemblyai.com/pricing>. If the page changes,
the page wins, and this table, `RATE_USD_PER_HOUR` in
[`src/domain/spend-ledger.ts`](../src/domain/spend-ledger.ts) and `PUBLISHED_RATES` in
[`src/features/cost/published-rate.ts`](../src/features/cost/published-rate.ts) are
corrected in the same change. `tests/features/cost/rate-estimate.test.tsx` fails if a rate
in the code is missing from this table.

| Product | Rate | Per minute |
|---|---|---|
| Voice Agent API, everything included | **$4.50/hr** | $0.075/min |
| Streaming Universal-3.5 Pro Realtime | **$0.45/hr** | $0.0075/min |
| Medical Mode, surcharge | **+$0.15/hr** | $0.0025/min |

A session opens both sockets at once, and the recognizer runs with `domain: "medical-v1"`
([`src/realtime/tokens.ts`](../src/realtime/tokens.ts)), so all three lines bill together:
$4.50 + $0.45 + $0.15 = **$5.10/hr**, which is **$0.085/min**.

## What caps the spend?

| Cap | Value | Enforced by | Status |
|---|---|---|---|
| Free credit on a new account | **$50**, no card required | the vendor | **Cited**, price list |
| Daily socket budget of the deployment | 7200 s in code, 86,400 s in production, clamped to 0 to 86,400 | the token routes, before minting | **Enforced** |
| One client's share | half of the daily budget | the same routes | **Enforced** |
| Session length | `max_session_duration_seconds`, 900 s by default, clamped to 60 to 10,800 | the vendor, on the token | **Enforced** |
| Token redemption window | `expires_in_seconds`, 60 s by default, clamped to 1 to 600 | the vendor, on the token | **Enforced** |
| New sessions per minute, free tier | **5**; exceeding it closes the socket with **1008** | the vendor | **Cited** limit, close code **Observed** |
| Spacing in a measurement sweep | **24 s** | the `EER_SPACING_MS` default | **Enforced** as a default |
| Streaming session length | **3 hours**, then the vendor closes the socket | the vendor | **Cited**, vendor prose |

**The daily budget counts ceilings, not open time.** `DEFAULT_DAILY_BUDGET_SECONDS` is 7200
in [`src/domain/live/budget.ts`](../src/domain/live/budget.ts); production sets
`READBACK_DAILY_BUDGET_SECONDS=86400`. Each token route debits the token's whole
`max_session_duration_seconds` before minting, refunds it only when the vendor refuses to
mint, and stops minting for the rest of the UTC day once the budget is spent. A call mints two
tokens, so at the default ceiling of 900 s it debits at least 1,800 s whether it lasts ten
seconds or fifteen minutes. The budget is in socket-seconds, not dollars: 86,400 s bounds a
day at 12 hours of two-socket calls, **$61.20**, or **$108** if every debit were an agent
token. One client, keyed by a hash of the platform-reported address, may spend at most half.
The Redis keys, the client hashing and what the budget does not stop are in
[security](security.md#spend-has-a-shared-ceiling-and-it-is-not-a-rate-limit), together with
the per-instance rate brake, which is a different thing and is not a rate limit.

**The session ceiling bounds a forgotten tab.** Token lifetimes come from
`TOKEN_EXPIRES_IN_SECONDS` and `MAX_SESSION_DURATION_SECONDS`, clamped in
[`src/domain/token-lifetime.ts`](../src/domain/token-lifetime.ts); the vendor, not our
function, closes a session that reaches its ceiling.

**The 24 s spacing** comes from the 5-per-minute limit with margin, since each run opens a
socket. `scripts/measure/measure-eer.ts`, `measure-live.ts` and `measure-units.ts` read
`EER_SPACING_MS` with a default of 24000, and
[`scripts/measure/measure-guard.ts`](../scripts/measure/measure-guard.ts) prints the spacing
and the expected duration. At 1 s spacing, 21 of 40 sockets closed with 1008
([`eval/REPORT.md`](../eval/REPORT.md), "Paid runs and spend").

An account with no card attached has a hard ceiling at its credit: past it a forgotten tab
stops the service instead of producing a bill. That is the account owner's choice, not
something the code enforces.

## Which commands pay?

**Tests never pay.** [`tests/setup.ts`](../tests/setup.ts) blanks `ASSEMBLYAI_API_KEY`,
`ASSEMBLYAI_AGENT_ID` and `BLOB_READ_WRITE_TOKEN` before any test module is imported, so the
rule rests on a mechanism rather than on review. A test that needs a value sets its own with
`vi.stubEnv`. `make help` lists every paying target under "These open real AssemblyAI
sockets and bill".

| Command | Pays | What it spends on |
|---|---|---|
| `make test`, `make verify` | **no** | fixtures and local files; `VERIFY_STEPS` in the `Makefile` is the list |
| `make e2e` | **no** | Playwright with a fake microphone against `npm run dev`, or `E2E_BASE_URL` if set; no spec completes a live call |
| `make measure` | **no** | the gate's decision time over fixtures; its live path is not implemented |
| `make honest`, `make coverage-matrix`, `make ab-gate`, `make audit-checksums`, `make spend`, `make live-runs` | **no** | recorded runs and local arithmetic |
| `make doctor` | **no** | ordinary HTTPS requests; it opens no socket |
| `make eval`, `make eval-keyterms`, `make eval-repeat` | **yes** | the development set, 40 sessions each, recognizer socket only |
| `make eval-control`, `make eval-native16` | **yes** | 40 sessions each, recognizer socket only |
| `make eval-heldout` | **yes** | the sealed held-out set, 60 sessions, recognizer socket only |
| `make eval-units` | **yes** | the unit set, 12 sessions, recognizer socket only |
| `make eval-live`, `make eval-live-keyterms` | **yes** | the human voice set through the recognizer; `eval/live/manifest.json` lists 75 lines and 0 recordings, so there is nothing to send yet |
| `make live-smoke` | **yes** | six scripted calls, both sockets; needs `LIVE_SMOKE_CONFIRM_PAID=1` and an https `LIVE_SMOKE_URL` |
| `npx tsx scripts/report/probe-stt.ts`, `npx tsx scripts/report/probe-witness.ts` | **yes** | one probe session each, recorded in the ledger |

## What does a forgotten tab pay for?

Billing runs on the time a WebSocket is open, not on the audio sent. Silence costs the same
as speech.

| Scenario | Duration | Cost |
|---|---|---|
| An unclosed agent socket | about **30 s** before the vendor drops it; **Observed**, no artefact records it | $0.0375 at $4.50/hr |
| Both sockets, tab killed, default token ceiling | up to **900 s** | **up to $1.275** at $5.10/hr |
| Both sockets, ceiling raised to the vendor maximum | up to **3 hours** | **up to $15.30** at $5.10/hr |
| A day of live debugging | about 1.5 h of both sockets | about **$7.65** at $5.10/hr; **Assumption, not result** |

Hence the exit rule: **`session.end`, then wait for `session.ended`**, on every path: the stop
button, the tab closing, an error. The agent client sends `session.end` and the recognizer
client sends `Terminate`; each waits up to 4 s for the vendor's confirmation before closing
with 1000 ([`src/realtime/agent-client.ts`](../src/realtime/agent-client.ts),
[`src/realtime/stt-client.ts`](../src/realtime/stt-client.ts)).
[`src/realtime/exit-path.ts`](../src/realtime/exit-path.ts) closes both on `pagehide`.

## How is spend reported?

`make spend` derives the total from [`eval/spend-ledger.json`](../eval/spend-ledger.json) at
the rates above, and prints no figure at all when no run is recorded, because a zero would be
a number nobody measured. Every paying target above appends its run with its socket-open
seconds, except `make eval-units`, whose runs only `make live-runs` counts.
Paid runs made before the ledger existed are counted by `make live-runs` from the artefacts
they left; where their socket time was never recorded, their cost is reported as unknown, not
as zero. A price literal in a script is forbidden: scripts call `ratePerHourFor`.

The derived total is an estimate, socket seconds times the published rate, not an invoice.
The one figure checked against the vendor is the account balance, which a person reads off
the dashboard and records in the ledger's `balanceObservations` with its date; `make spend`
prints it beside the derived total.

## What happens on a disconnect or at a limit?

The measurement scripts retry only the vendor codes `at_capacity`, `concurrency_exceeded` and
`internal_error`, and network-level transport failures such as a reset connection or a
timeout, with backoff of 5, 15 and 45 s ([`scripts/eer/retry.ts`](../scripts/eer/retry.ts)).
Anything else is not transient, and a retry doubles the spend without fixing it.

**Close code 1008 is the new-session limit, not a transport failure.** Reading it as a
failure and reconnecting turns a measurement sweep into a fabricated error rate. The scripts
do not drop a non-1000 session from the error rate by themselves: the report prints the close
codes seen, latency percentiles use only sessions that closed 1000, and the ledger marks a
run with any non-1000 close as failed. A run containing 1008 closes is discarded and repeated
at 24 s spacing, as the operator action in
[`src/realtime/close-codes.ts`](../src/realtime/close-codes.ts) says. None of the close codes
is documented by the vendor;
[limitations](limitations.md#close-codes-are-observations-not-specification) says which we
observed ourselves.

Tokens are single-use. A reconnect and a `session.resume` need a freshly minted token, and
each one debits the daily budget again.

## Where do these figures come from?

| Figure | Source |
|---|---|
| Rates, free credit, 5 new sessions per minute | <https://www.assemblyai.com/pricing> |
| Token lifetimes | <https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token> |
| Agent socket | <https://www.assemblyai.com/docs/voice-agents/voice-agent-api> |

---

<sub>[Documentation index](README.md) · [Project README](../README.md)</sub>
