# Budget guardrails: hard limits and where every figure came from

The tariff was verified on **17.09.2026** against https://www.assemblyai.com/pricing. The
numbers below come from that source, not from memory. If the page has changed, **the page
wins**, and this file is corrected in the same change.

**Never attach a card for the sake of this project.** The free tier gives $50 with no
card; an attached card removes the ceiling past which a forgotten tab stops being a
warning and becomes a bill.

## Rates, verbatim from the price list

| Product | Rate | What it means per minute |
|---|---|---|
| Voice Agent API, everything included | **$4.50/hr** | $0.075/min |
| Streaming Universal-3.5 Pro Realtime | **$0.45/hr** | $0.0075/min |
| Medical Mode, surcharge | **+$0.15/hr** | $0.0025/min |

**Our session opens two sockets at once**, so the sum is billed:
$4.50 + $0.45 + $0.15 = **$5.10/hr**, that is **$0.085/min**. One socket does not cancel
the other — that is the main reason a single forgotten tab is expensive.

## The ceilings we set ourselves

| Limit | Value | Basis |
|---|---|---|
| Free credits on registration | **$50**, no card needed | Price list, verified 17.09 |
| Our current available balance | **$149.93** as of 17.09 | Not from the price list: the actual account balance |
| Spent as of 17.09 | **about $0.20** | Our own ledger of live runs |
| New sessions per minute, free tier | **5** | Price list. We measured the violation: it closes with **1008**, not the documented 3009 |
| Interval between runs in a measurement sweep | **24 s** | Derived from the 5/min limit with margin; at a one-second interval 21 of 40 sockets closed with 1008 |
| Maximum streaming session length | **3 hours**, auto-close | Price list, the prose of the limits section |

## Where the money goes and where it does not

The project rule: **tests do not spend credits.** Paid calls live in exactly two commands.

| Command | Pays | Order of spend |
|---|---|---|
| `make test` | **no** | $0. Fixtures and local files |
| `make verify` | **no** | $0. Every step is local; `VERIFY_STEPS` in the `Makefile` is the list |
| `make e2e` | **no** | $0. Playwright with a fake microphone |
| `make measure` | **no** | $0. Its live path is not implemented; it reports the gate's decision latency from fixtures and names the rows that stay unmeasured |
| `make eval` | **yes** | A run over the held-out set, 60 sessions |

A mechanical guarantee matters more than discipline: a test that accidentally reaches a
paid API is not found straight away but on the bill at the end. So the credentials are
blanked at module scope in `tests/setup.ts`, before any test module is imported, and the
rule rests on that rather than on review. A test that needs a value sets its own with
`vi.stubEnv`.

## What a forgotten tab pays for

Billing runs **on the time the WebSocket is open**, not on the volume of audio sent.
Silence costs the same as speech.

| Scenario | Duration | Cost |
|---|---|---|
| An unclosed agent socket | lingers about **30 s** | $0.0375 at the $4.50/hr rate |
| An unclosed STT socket up to auto-close | up to **3 hours** | **$1.35** at the $0.45/hr rate |
| Both sockets, tab closed incorrectly | up to **3 hours** | **up to $15.30** at the combined $5.10/hr rate |
| A day of live debugging | — | we observed **$7.65** |

Hence the exit rule: **`session.end`, then waiting for `session.ended`** on every path —
the Stop button, the tab closing, an error. Not "fire and forget", but confirmation.

A caveat about precision: **the 30 s of agent-socket lingering and the ~60 s to close with
no audio were each measured from a single observation**, and no interval was built under
them. They are left in the calculation as an estimate, not as a measured value — more
detail in [assemblyai-api.md](assemblyai-api.md), the section on the provenance of facts.

## What to do on a disconnect and at a limit

Retry the request **only** on `at_capacity`, `concurrency_exceeded` and `internal_error`.
Everything else is not a transport error, and a retry will not fix it — it will double the
spend.

**Code 1008 means the new-session limit, not a transport failure.** Reading it as a failure
and starting to reconnect is a way to turn a measurement sweep into a fabricated error
rate. A run in which even one 1008 occurred is not evaluated: it is discarded and repeated
at a 24 s interval.

Tokens are single-use. A reconnect and a `session.resume` need a **fresh** token; reusing
one fails quietly enough to cost an hour of searching.

## Official pages

- Price list: https://www.assemblyai.com/pricing
- Limits and models: [assemblyai-api.md](assemblyai-api.md)
- What the platform actually allows: [vercel.md](vercel.md)
