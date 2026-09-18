# What the platform actually allows

Verified against Vercel's current documentation rather than memory; each section carries
the doc it came from and the date that page was last updated. This file was once an
assessment written before the architecture was chosen — seven questions, three candidate
designs and a recommendation. The decision is made, so what survives is the constraints
that still bind and the reasoning a reader needs to understand why the application is
shaped this way.

**The architecture: one Next.js application, the browser holding both AssemblyAI sockets
directly, short HTTPS routes on the server, finished sessions in Vercel Blob.** No Docker,
no always-on process, no database server.

One question that was live at the time is now closed and is not reproduced: whether to keep
FastAPI. Vercel supports it as a first-class preset with WebSockets and the same duration
limits as Node, so it was a real option. With the frontend on Next.js, holding a Python
service for five ten-line routes was overhead, and the project is TypeScript throughout.

---

## The browser connects to both sockets directly

Both APIs accept a short-lived token in a query parameter, so no proxy is needed for either socket.

### Streaming STT v3

| Parameter | Value |
|---|---|
| Token endpoint | `GET https://streaming.assemblyai.com/v3/token` |
| Auth for minting | header `Authorization: <API_KEY>` (no Bearer) |
| `expires_in_seconds` | required, 1–600 |
| `max_session_duration_seconds` | optional, 60–10800, default 3 hours |
| Connection | `wss://streaming.assemblyai.com/v3/ws?token=<TOKEN>&sample_rate=16000&speech_model=...` |
| Constraint | the token is single-use, one session |

Doc: https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token (also https://www.assemblyai.com/docs/universal-streaming/authenticate-with-a-temporary-token, API reference https://assemblyai.com/docs/api-reference/streaming/create-temporary-token). The main doc prescribes it outright: "Don't ship your API key to client-side code. Authenticate from the browser with a short-lived temporary token instead" (https://www.assemblyai.com/docs/speech-to-text/universal-streaming).

### Voice Agent API

| Parameter | Value |
|---|---|
| Token endpoint | `GET https://agents.assemblyai.com/v1/token` |
| Auth for minting | header `Authorization: Bearer <API_KEY>` |
| `expires_in_seconds` | 1–600 (60–300 recommended) — this is the **window for opening the socket**, not the session length |
| `max_session_duration_seconds` | 60–10800 — the ceiling on the length of the session itself |
| Connection | `wss://agents.assemblyai.com/v1/ws?token=<TOKEN>` |
| Then | the browser sends one `session.update` with `agent_id`, and the prompt, voice and tools are pulled from the stored agent |

Doc: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration. It gives the server-side minting route outright (Express, 6 lines) and the client-side connection. "No proxy required" — the browser goes direct.

**Conclusion: the whole audio proxy from our plan can be deleted.** Two token routes (GET, ~50 ms) replace it entirely.

---

---

## What stays on the server

Only short HTTPS requests. The Voice Agent API supports server-side HTTP tools: AssemblyAI calls our webhook itself, so no `tool.call`/`tool.result` round trip happens in the client at all.

Docs: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/overview, https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/http-tools, https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/client-side-tools

Two kinds of tools:
1. **HTTP tools (server-side)** — "You define these on a stored agent with a URL and parameters. **AssemblyAI makes the request for you** and feeds the result to the model." The client executes nothing. No `tool.call`/`tool.result` round trip.
2. **Function tools (client-side)** — inline in `session.tools`, via `tool.call` → `tool.result`.

The client-side tools doc itself recommends the server-side path: "If your tool just calls an HTTP API, **prefer a server-side HTTP tool**: AssemblyAI makes the request for you and your client never handles the round trip."

### Stored agents (mandatory for HTTP tools)

| Parameter | Value |
|---|---|
| Endpoint | `POST https://agents.assemblyai.com/v1/agents` |
| Required fields | `name`, `system_prompt`, `voice` |
| Tools | an array with `name`, `description`, `parameters` (JSON Schema), `http: { url, http_method }` |
| Usage | the response contains `id` → we pass it as `agent_id` in `session.update` |

Doc: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/create-agent, management — https://www.assemblyai.com/docs/voice-agents/voice-agent-api/manage-agents

**The key caveat: "HTTP tools work exclusively with stored agents, not inline `session.update` from browsers".** So the agent has to be created in advance (one `curl` at deploy time or in CI); an HTTP tool cannot be declared inline from the browser. For us that is not a problem but an advantage: the browser cannot substitute the tools.

Characteristics of HTTP tools that matter to us:
- HTTPS and public hosts only; private and loopback are blocked. Local development requires a tunnel.
- The response is truncated at **8 KiB**.
- Headers in `http.headers` are write-only, encrypted at rest and not returned — our shared secret can go there.
- Argument mapping: GET/DELETE → query string, POST/PUT/PATCH → JSON body.
- Non-2xx responses and timeouts are returned to the model as a recoverable error.
- Modes: `interactive` (the default, <5 s, the agent speaks a transitional phrase) and `hold` (>10 s, the agent stays silent). **Our validator and gate → `interactive`.**

### Exactly what stays on Vercel

| Endpoint | Kind | Duration |
|---|---|---|
| `GET /api/stt-token` | mints an STT v3 token | ~50 ms |
| `GET /api/agent-token` | mints a Voice Agent token | ~50 ms |
| `POST /api/tools/confirm-order` | HTTP tool webhook from AssemblyAI | <1 s |
| `POST /api/session/finalize` | receives the transcript and metrics from the browser | <1 s |
| `GET /api/session/:id` | reads the result | <1 s |

All of it short requests. **Serverless is a perfect fit, nothing always-on.**

---

---

## Storage, with no additional infrastructure

Vercel no longer has a first-party SQL or KV product: Postgres and KV are retired and the Marketplace (Neon, Upstash, Supabase) took their place. The first-party products left are Blob and Global Config, and Blob is available on Hobby.

Doc: https://vercel.com/docs/storage (last_updated **2026-09-03**), https://vercel.com/docs/marketplace-storage

| Product | First-party? | Purpose | Plans |
|---|---|---|---|
| **Vercel Blob** | **Yes** | files and objects of any size | Hobby, Pro |
| **Global Config** | **Yes** | runtime config, feature flags. Reads <1 ms, **writes take seconds** | Hobby, Pro, Ent |
| Marketplace storage | No (Neon/Upstash/Supabase/Mongo) | Postgres, Redis, NoSQL, vector | depends on the provider |

The answer to "does this need a separate sign-up with a third party":
- Formally there is **no separate sign-up**: `vercel install neon` / `vercel install upstash` — one command, installs the integration, binds it to the project, pulls the credentials into `.env.local`, "Vercel injects provisioned resource credentials as environment variables", billing through Vercel. But legally it is a third-party resource, and Vercel writes it that way too.
- **With zero third-party dependency at all — only Blob.**

In the Hobby/Pro comparison table the Storage row reads exactly: Hobby — Blob, Pro — Blob (https://vercel.com/docs/plans/hobby). There is no Postgres or KV in the plan lists any more.

Included in Hobby (https://vercel.com/docs/plans/hobby): 1,000,000 function invocations, **4 CPU-hrs Active CPU**, 360 GB-hrs provisioned memory, 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer, Global Config — 100,000 reads but **only 100 writes**. Also: Hobby is restricted to "non-commercial, personal use only" (fair use), which is fine for a hackathon.

**Our recommendation:** orders, transcripts and metrics as JSON in **Vercel Blob**, key `sessions/<session_id>.json`. Zero third-party services, zero schema, readable after the session. Global Config is unsuitable — 100 writes a month, and a write takes seconds.

---

---

## Why this architecture and not the two alternatives

| | **What we built**: browser to AssemblyAI direct | **Rejected**: a separate always-on backend | **Rejected**: inbound WS inside a function |
|---|---|---|---|
| Audio path | browser ↔ AssemblyAI (2 sockets, tokens) | browser ↔ our backend ↔ AssemblyAI | browser ↔ Vercel Function ↔ AssemblyAI |
| Always-on service | **no** | yes (Fly/Railway/Render) | no |
| Docker | **no** | usually yes | no |
| Server code | 5 short HTTPS routes | a full WS proxy | a WS handler plus routes |
| `tool.call` | HTTP tools, AssemblyAI calls our webhook | our code inside the socket | our code inside the socket |
| Session length limit | **none** (`max_session_duration_seconds` up to 10800 s) | none | **300 s Hobby / 800 s Pro** — a 10-minute session is torn on Hobby |
| Latency | **minimal** (no extra hop) | +1 hop through our region | +1 hop through `iad1` |
| Word-level provenance | client-side → **data under the attacker's control** | server-side, trusted | server-side, trusted |
| Latency metrics | server-side through `GET /v1/sessions` (turn-level) plus client-side | fully server-side, word-level | fully server-side |
| Cost | within Hobby | +$5-20/month | Active CPU for handling messages |
| Deployment complexity | **one `vercel` command** | two deployments, two configs, CORS | one deployment, but a beta feature |
| Secrets | API key on the server only (tokens short-lived) | key on the server only | key on the server only |
| Officially supported | **yes, this is Vercel's canonical pattern** | yes (standard everywhere) | yes, but **public beta** since June 2026 |
| What breaks | trust in client-side data; HTTP tools require a stored agent; debugging the webhook locally needs a tunnel | an extra service, cold start and free-tier sleep, two sources of truth | a cut-off at max duration; a reconnect mid-session; betas |

---

---

## What this architecture costs: provenance and latency measurement

**Word-level provenance works, but stops being trusted. For a demo that does not matter; for production it does.** This is the price of removing the proxy, and it is stated in [limitations.md](limitations.md) rather than left to be discovered.

The mechanics do not change: the browser receives `Turn` messages with `words[]` and a `start`/`end` per word from STT v3 directly, matches the text hint onto a span of words, runs the validators and decides the gate. The same algorithm, a different executor.

Exactly what is lost:
- Provenance computed in the browser is **attacker-controlled data**. A user can open DevTools and send any `gate: "pass"` with any timings to `POST /api/session/finalize` without having uttered a word.
- For a hackathon demo this is unimportant: the judges watch that the system works on honest input, they do not try to break it. No jury member will open the console to forge word offsets.
- If insurance is wanted cheaply: make the gate decision a **server-side HTTP tool**. The browser sends the recognised span and the hint to the webhook, the server runs the validators itself and returns the outcome. Then the input timings can be forged but the decision logic cannot — a compromise costing one function.
- Fully trusted provenance requires the audio to pass through our server, that is option B or C. That is the price, and it should be paid only if the threat model really includes a malicious user.

**Latency can be measured server-side, but only at reply level, not word level.**

Through `GET /v1/sessions` and `GET /v1/sessions/{id}` (https://www.assemblyai.com/docs/voice-agents/voice-agent-api/session-history) the following are available:
- a list of finished sessions (polling by `session_id`/`created_at`; **there is no session-completion webhook in the doc**),
- artifacts as short-lived pre-signed download URLs: audio, timeline, metadata,
- a timeline with turn-level timestamps: the start and end of the agent's reply, **`time_to_first_audio_ms`**,
- `duration_ms` per tool call — that is, **the latency of our gate webhook is measured server-side and exactly**.

What is not there: **word-level timings are absent from session history** (turn-level only). So "how long from the spoken word to the reaction" cannot be reconstructed server-side from session history — it has to be either measured in the browser and sent (untrusted, but sufficient for a demo chart) or accepted at turn-level granularity.

Conclusion on metrics: `time_to_first_audio_ms` and tool-call latency are server-side and honest; word-to-gate is client-side only.

---

---

## Summary of what is unconfirmed

| Claim | Status |
|---|---|
| A Vercel Function can open an outbound WS to a third-party server | no direct quotation in the docs; inferred from "Full Node.js coverage" plus the Sandbox guide |
| WebRTC termination on Vercel | no documentation found; treat as absent |
| A session-completion webhook in the Voice Agent API | not mentioned in the docs; the docs recommend polling `GET /v1/sessions` |
| The exact default HTTP tool timeout | marked configurable in the doc, the concrete value was not extracted |
| Availability of Vercel Sandbox on Hobby and its price | not stated in the guide |
