# Technical reference: AssemblyAI for voice agents

The state of things as of September 2026. Sources are given in each section.

---

## Voice Agent API

A single speech-to-speech stack: STT + LLM + TTS + turn detection + interruptions + tool calling in one WebSocket. There is no need to stitch separate providers together with an orchestrator. Declared `PCI-certified end-to-end`.

Sources:
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/api-spec/voice-agent-websocket
- https://www.assemblyai.com/products/voice-agent-api
- https://www.assemblyai.com/blog/raw-websocket-voice-agent-voice-agent-api

### Endpoint and authentication

```
wss://agents.assemblyai.com/v1/ws
```

Two ways to authenticate:

1. Server-side — a header (a browser cannot do this; headers cannot be set on a WebSocket from JS):
```
Authorization: Bearer YOUR_ASSEMBLYAI_API_KEY
```

2. Browser — a single-use temporary token in a query parameter:
```
GET https://agents.assemblyai.com/v1/token?expires_in_seconds=300
Authorization: Bearer YOUR_ASSEMBLYAI_API_KEY
→ { "token": "..." }

wss://agents.assemblyai.com/v1/ws?token=<token>
```

Minting the token on the backend (Express), the reference pattern:

```javascript
app.get("/api/voice-token", async (_req, res) => {
  const response = await fetch(
    "https://agents.assemblyai.com/v1/token?expires_in_seconds=300",
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  const { token } = await response.json();
  res.json({ token });
});
```

The REST API for managing sessions and agents:

| Call | Purpose |
|---|---|
| `POST https://agents.assemblyai.com/v1/agents` | create a reusable agent, once |
| `GET https://agents.assemblyai.com/v1/sessions?limit=5` | list recent sessions |
| `GET https://agents.assemblyai.com/v1/sessions/$SESSION_ID` | one session and its artifacts |

Session artifacts (through `GET /v1/sessions/{id}`): `audio` (OGG/Opus), `timeline` (a JSON log, pairs of `user_transcript` ↔ `agent_text`), `metadata` (JSON). The download links are pre-signed with a short TTL; store the `session_id` and request fresh links again rather than caching the URL.

### Audio format

Three encoding options, set in `input.format.encoding` and `output.format.encoding`:

| encoding | Description | Sample rate |
|---|---|---|
| `audio/pcm` | PCM16, 16-bit signed little-endian, mono (the default) | 24,000 Hz |
| `audio/pcmu` | G.711 μ-law, mono (telephony) | 8,000 Hz |
| `audio/pcma` | G.711 A-law, mono (telephony) | 8,000 Hz |

Audio is transmitted **not as binary frames** but as base64 inside an `input.audio` JSON message. This differs from Streaming STT.

The recommended chunk size is **~50 ms**. The requirement is not strict: the server buffers and joins the chunks.

### The protocol: events and messages

The order: open the socket → send `session.update` as the first message → wait for `session.ready` → stream `input.audio`.

**Client → server (6 types)**

```json
{
  "type": "session.update",
  "session": {
    "agent_id": "string (optional)",
    "system_prompt": "string",
    "greeting": "string",
    "input": {
      "format": { "encoding": "audio/pcm|audio/pcmu|audio/pcma" },
      "keyterms": ["string"],
      "turn_detection": {
        "vad_threshold": 0.5,
        "min_silence": 1000,
        "max_silence": 3000,
        "interrupt_response": true
      }
    },
    "output": {
      "voice": "anna",
      "format": { "encoding": "audio/pcm|audio/pcmu|audio/pcma" },
      "volume": 0
    },
    "tools": [ /* see the Tool calling section */ ]
  }
}
```

```json
{ "type": "input.audio", "audio": "base64_encoded_pcm_bytes" }
{ "type": "tool.result", "call_id": "string", "result": "JSON_encoded_string" }
{ "type": "session.resume", "session_id": "string" }
{ "type": "reply.create", "instructions": "string (optional)" }
{ "type": "session.end" }
```

`reply.create` makes the agent speak of its own accord (a one-shot instruction; `system_prompt` is unchanged). Useful for proactive utterances and silence timeouts.

**Server → client (12+ types)**

| Event | Fields | What to do |
|---|---|---|
| `session.ready` | `type`, `session_id` | store the `session_id` for `session.resume` |
| `session.updated` | `type` | the configuration has been applied |
| `input.speech.started` | `type` | the user has started speaking — playback can be muted |
| `input.speech.stopped` | `type` | the end of the user's speech |
| `transcript.user.delta` | `type`, `text` | a partial transcript (for live subtitles) |
| `transcript.user` | `type`, `text`, `item_id` | the final transcript of the user's turn |
| `reply.started` | `type`, `reply_id` | the agent has started replying |
| `reply.audio` | `type`, `data` (base64) | a chunk of TTS audio — decode and play it |
| `transcript.agent` | `type`, `text`, `reply_id`, `item_id`, `interrupted` (bool) | the full text of the agent's reply |
| `reply.done` | `type`, `status`: `"completed"` \| `"interrupted"` | the end of the reply; the barrier for sending tool.result |
| `tool.call` | `type`, `call_id`, `name`, `arguments` (an object, already parsed) | execute the function |
| `session.error` / `error` | `type`, `code`, `message`, optionally `timestamp`, `param` | handle the error |
| `session.ended` | `type`, `session_duration_seconds`, `timestamp`, optionally `audio_duration_seconds` | closing |

### Tool calling (JSON Schema)

Tools are declared in `session.tools`. The schema is close to OpenAI function calling, but flat (`name`/`description`/`parameters` at the top level of the object, with no nested `function`).

```json
{
  "type": "function",
  "name": "lookup_order",
  "description": "Look up an order by its ID",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": { "type": "string", "description": "The order ID" }
    },
    "required": ["order_id"]
  },
  "execution_mode": "interactive",
  "timeout_seconds": 120
}
```

- `execution_mode`: `interactive` (the default) — the agent keeps talking while it waits; `hold` — it holds a pause.
- `timeout_seconds`: 1–300, 120 by default.
- **Server-side HTTP tools** are also supported: the tool is given an HTTP endpoint, AssemblyAI calls it itself and inserts the response into the conversation — the client has nothing to do.

**A client-side tool implementation must accumulate results and send them only on
`reply.done`.** A `tool.call` is executed and queued; when `reply.done` arrives with
`status: "completed"` each queued result is sent as a `tool.result`, and on
`status: "interrupted"` the queue is discarded because the user changed their mind mid-reply.
Sending `tool.result` before the barrier is the most frequent mistake against this API.

**This product does none of that**, because its tools are server-side HTTP endpoints that
AssemblyAI calls directly. The section below on why the race does not exist for us sets out
what that buys.

Note the asymmetry either way: `arguments` in `tool.call` arrives as a ready-made object,
while `result` in `tool.result` must be sent as a JSON string.

### Turn detection / VAD / interruptions

Everything lives in `session.input.turn_detection`:

| Parameter | Range | Default | Meaning |
|---|---|---|---|
| `vad_threshold` | 0.0–1.0 | 0.5 | VAD sensitivity; **lower = more sensitive** |
| `min_silence` | 50–10000 ms | 1000 | the pause after which the end-of-turn check begins |
| `max_silence` | 50–10000 ms | 3000 | a hard end of turn regardless of punctuation |
| `interrupt_response` | bool | `true` | permit barge-in: the user's speech interrupts the agent |

`min_silence` must be strictly less than `max_silence`.

**Setting `min_silence` or `max_silence` turns off adaptive pacing and entity-aware
waiting for the rest of the session — documented by the vendor verbatim, read on the live
page on 17 September 2026:**

> "Setting `min_silence` or `max_silence` turns off the adaptive pacing and
> entity-aware waiting described above for the rest of the session."
>
> "When a tool parameter expects a phone number, email, date, or other entity, the
> agent waits for the whole value before ending your turn, instead of jumping in
> after the first pause."

Source: <https://www.assemblyai.com/docs/voice-agents/voice-agent-api/turn-detection-and-interruptions>,
read 17.09.2026.

Entity-aware waiting is exactly what protects an NPI or DEA number dictated in
groups: without it, a shortened endpoint timeout can cut the number off before the
checksum, which then fails on a value nobody mis-said. That is why `min_silence` and
`max_silence` are **deliberately not set** in the stored agent definition or in the live
patch of the agent socket — the decision was taken on 17.09.2026 and is recorded in
`src/realtime/patience.ts`.

**The disabling affects only those two parameters.** `vad_threshold` and
`interrupt_response` are not part of it and are still sent.

**For the STT socket it is the other way round.** There `min_turn_silence`/`max_turn_silence`
**widen** the entity waiting window rather than disabling it, so `sttPatiencePatch` keeps
sending both parameters to the recognition socket. The two sockets take opposite parameter
names for opposite effects — sending the agent's names to the recognition
socket yields close code **3006** ("malformed configuration parameter"),
measured by another team in the field, rather than a meaningful error.

**Whether a subsequent `session.update` without those fields restores the adaptive behaviour
is not documented.** The wording "for the rest of the session" argues rather
against restoration, but the only way to check it is a paid run, and no such
run has happened. Do not claim either way until one has.

Handling an interruption on the client — three mandatory actions:
1. On `input.speech.started` (or on `reply.done` with `status: "interrupted"`) — **flush the playback buffer**, stopping every scheduled `AudioBufferSourceNode`.
2. Reset the playback time cursor to `audioCtx.currentTime`.
3. Clear `pending_tools`.

```javascript
function flushPlayback() {
  for (const src of scheduledSources) {
    try { src.stop(); } catch (_) {}
  }
  scheduledSources = [];
  playbackTime = audioCtx.currentTime;
}
```

### Configuration parameters

- `agent_id` and the inline fields (`system_prompt`, `greeting`, `tools`, `input`, `output`) are **mutually exclusive**. Either a binding to a stored agent from `POST /v1/agents`, or everything inline.
- `greeting` and `output` are **immutable after `session.ready`**. The voice cannot be changed on the fly. The rest (`system_prompt`, `tools`, `input.keyterms`, `turn_detection`) can be re-sent with `session.update` in the middle of a conversation.
- `session.resume` works for **30 seconds** after the connection drops.
- `input.keyterms` — biasing the recognition towards the domain (names, SKUs, terms).
- **Custom LLM / BYO-LLM** is supported: your own OpenAI-compatible endpoint instead of the built-in one.
- Voices: **18 English and 16 multilingual** from the AssemblyAI catalogue (`anna` is the default, and also `ivy`, `james` — conversational US male, `sophie` — clear UK female, `diego` — Latin American Spanish, `arjun` — Hindi/Hinglish). These are **not** ElevenLabs voice IDs.
- Telephony: a SIP trunk through Twilio / Telnyx — with no webhook or media server of your own.
- The starters in the docs: minimal, keyterm biasing, turn-taking, byo-llm, HTTP tools, web search (Exa), CRM (Airtable), booking (Cal), DTMF/PCI.

**Latency:** about 1 second end to end from the end of the user's turn to the start of the agent's speech; Universal-3.5 Pro ASR under the hood.

---

## Realtime Streaming STT

Speech recognition only, with no LLM and no TTS. Needed if you want to assemble the pipeline yourself (your own LLM plus your own TTS, for example) or if you need transcripts, diarisation or PII redaction.

Sources:
- https://www.assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio
- https://www.assemblyai.com/docs/api-reference/streaming-api/streaming-api
- https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token
- https://www.assemblyai.com/products/streaming-speech-to-text

### Endpoint and authentication

| Socket URL | Region |
|---|---|
| `wss://streaming.assemblyai.com/v3/ws` | global, latency-optimised |
| `wss://streaming.us.assemblyai.com/v3/ws` | US data residency |
| `wss://streaming.eu.assemblyai.com/v3/ws` | EU data residency |

Authentication:
- The header `Authorization: <YOUR_API_KEY>` — **with no `Bearer` prefix** (unlike the Voice Agent API and the LLM Gateway!).
- Or the query parameter `token=<temporary_token>` for the browser.

Minting a temporary token:

```
GET https://streaming.assemblyai.com/v3/token
    ?expires_in_seconds=60
    &max_session_duration_seconds=3600
Authorization: <YOUR_API_KEY>

→ { "token": "<token_string>" }
```

- `expires_in_seconds`: mandatory, **1–600**.
- `max_session_duration_seconds`: optional, **60–10800** (3 hours is the default maximum).
- The token is **single-use** and good for exactly one session. Usage is charged to the originating API key.

```python
params_w_token = {**CONNECTION_PARAMS, "speech_model": "universal-3-5-pro", "token": token}
ws_app = websocket.WebSocketApp(f'{API_ENDPOINT_BASE_URL}?{urlencode(params_w_token)}')
```

### Audio format

- The default: **mono 16-bit PCM**, `encoding=pcm_s16le`, `sample_rate=16000`.
- Supported `encoding` values: `pcm_s16le`, `pcm_mulaw`, `opus`, `ogg_opus`, `aac` (ADTS framing).
- `sample_rate`: **8000–96000 Hz** (ignored for Opus/AAC — there the rate lives in the container).
- Audio is sent as **binary WebSocket frames** (`OPCODE_BINARY`), not base64.
- Chunk size: **50–1000 ms** of audio. The examples in the docs use 4096 bytes.

### The protocol: events and messages

**Client → server**

Audio is a binary frame. Everything else is JSON:

```json
{ "type": "Terminate" }
{ "type": "ForceEndpoint" }
{ "type": "KeepAlive" }
{
  "type": "UpdateConfiguration",
  "prompt": "string",
  "keyterms_prompt": ["string"],
  "min_turn_silence": 0,
  "max_turn_silence": 0,
  "continuous_partials": true,
  "vad_threshold": 0.5,
  "interruption_delay": 0,
  "agent_context": "string",
  "mode": "max_accuracy|min_latency|balanced",
  "end_of_turn_confidence_threshold": 0.4,
  "language_codes": ["en"],
  "session_heartbeat": false
}
```

`ForceEndpoint` forcibly closes the current turn and returns a final transcript without waiting for silence. A key thing for push-to-talk and for "the user pressed Send".

**Server → client**

```json
{
  "type": "Begin",
  "id": "uuid",
  "expires_at": 0,
  "configuration": {
    "model": "string",
    "mode": "string|null",
    "api_version": "string",
    "speaker_labels": false,
    "redact_pii": false,
    "filter_profanity": false,
    "domain": "string|null",
    "voice_focus": "string|null"
  }
}
```

```json
{ "type": "SpeechStarted", "timestamp": 0, "confidence": 0.0 }
```

```json
{
  "type": "Turn",
  "turn_order": 0,
  "turn_is_formatted": true,
  "end_of_turn": true,
  "transcript": "...",
  "utterance": "string|empty",
  "language_code": "en",
  "language_confidence": 0.98,
  "speaker_label": "A",
  "end_of_turn_confidence": 1.0,
  "words": [
    {
      "text": "hello",
      "start": 0,
      "end": 399,
      "confidence": 0.99,
      "word_is_final": true,
      "speaker": "A"
    }
  ]
}
```

The `start`/`end` timings are **in milliseconds**. `word_is_final` distinguishes words that are already fixed from those still being rewritten inside a partial transcript.

```json
{
  "type": "SpeakerRevision",
  "revisions": [
    { "turn_order": 0, "speaker_label": "A",
      "words": [ { "text": "...", "speaker": "A", "start": 0, "end": 0 } ] }
  ]
}
```

```json
{
  "type": "Heartbeat",
  "total_audio_received_ms": 0,
  "total_duration_ms": 0,
  "realtime_factor": 1.0,
  "max_speech_probability": 0.0
}
```

```json
{ "type": "Termination", "audio_duration_seconds": 10, "session_duration_seconds": 12 }
```

There is even a built-in LLM call straight from the STT socket — `LLMGatewayResponse` (see the `llm_gateway` query parameter):

```json
{
  "type": "LLMGatewayResponse",
  "turn_order": 0,
  "transcript": "...",
  "data": {
    "request_id": "...",
    "choices": [ { "message": { "role": "assistant", "content": "string|null",
      "tool_calls": [ { "id": "...", "type": "function",
        "function": { "name": "...", "arguments": "json-string" } } ] },
      "finish_reason": "stop" } ],
    "usage": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 }
  }
}
```

### Configuration parameters (query params)

| Parameter | Type | Default | Note |
|---|---|---|---|
| `speech_model` | string | `universal-3-5-pro` | plus `universal-streaming-english`, `universal-streaming-multilingual` |
| `encoding` | string | `pcm_s16le` | `pcm_s16le`, `pcm_mulaw`, `opus`, `ogg_opus`, `aac` |
| `sample_rate` | int | 16000 | 8000–96000 |
| `language_codes` | array | — | language steering, e.g. `["en","es"]` |
| `language_detection` | bool | false | adds `language_code`/`language_confidence` to Turn |
| `mode` | string | server default | `max_accuracy` \| `min_latency` \| `balanced`; Universal-3.5 Pro only |
| `domain` | string | — | `medical-v1` for medical terminology |
| `min_turn_silence` | int ms | depends on mode | 50–10000 |
| `max_turn_silence` | int ms | depends on the model | forces the end of a turn |
| `end_of_turn_confidence_threshold` | float | **0.4** | 0.0–1.0 |
| `vad_threshold` | float | depends on the model | 0.0–1.0 |
| `interruption_delay` | int ms | depends on mode | 0–1000, up to the first partial; U-3.5 Pro |
| `continuous_partials` | bool | **true** | a partial every ~3 s in a long turn |
| `include_partial_turns` | bool | **true** | forced to false when PII redaction is on |
| `format_turns` | bool | **false** | punctuation and casing; Universal Streaming only |
| `speaker_labels` | bool | false | streaming diarisation |
| `max_speakers` | int | — | 1–10 |
| `voice_focus` | string | — | `near-field` \| `far-field`, noise suppression |
| `voice_focus_threshold` | float | 0.7 | 0.0–1.0 |
| `redact_pii` | bool | false | — |
| `redact_pii_policies` | array | — | PII categories |
| `redact_pii_sub` | string | `hash` | `entity_name` \| `hash` |
| `filter_profanity` | bool | false | — |
| `prompt` | string | — | context, **max 1750 characters**, U-3.5 Pro |
| `keyterms_prompt` | array | — | a recognition boost, **max 100 terms** |
| `agent_context` | string | — | the agent's previous turn, max 1750 characters |
| `previous_context_n_turns` | int | 5 | 0–100 |
| `session_heartbeat` | bool | false | a Heartbeat every 5 s |
| `llm_gateway` | string | — | a JSON string with the LLM Gateway configuration |
| `inactivity_timeout` | int s | — | 5–3600 |

**Session limits:** a session closes automatically after **3 hours**. Billing is by the time the WebSocket is open, **not by the volume of audio sent**. An unclosed session hangs for up to three hours and is billed in full.

---

## LLM Gateway

An OpenAI-compatible gateway to 25+ models from different providers under a single AssemblyAI key. One bill together with STT, with no need to obtain OpenAI/Anthropic/Google keys.

Source: https://www.assemblyai.com/docs/llm-gateway/quickstart, https://www.assemblyai.com/docs/llm-gateway/available-models

### Endpoints and authentication

| Endpoint | Region |
|---|---|
| `https://llm-gateway.assemblyai.com/v1/chat/completions` | US, the default |
| `https://llm-gateway.eu.assemblyai.com/v1/chat/completions` | EU |

The header: `authorization: Bearer <YOUR_API_KEY>`.

The standard OpenAI SDK works — only `base_url` changes:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://llm-gateway.assemblyai.com/v1",
    api_key="<YOUR_API_KEY>",
)
```

The request is a standard chat completion (`model`, `messages`, `max_tokens`). The response carries an extra `request_id` field, with the content in the usual place: `result["choices"][0]["message"]["content"]`.

Capabilities: basic chat completions, streaming, multi-turn, structured outputs (JSON Schema with post-processing), tool/function calling, agentic workflows.

Rate limits: **per model, in a 60-second window** (requests per minute).

### Models (ID, price per 1M prompt/completion tokens, context, capabilities)

| Model ID | Provider | Prompt | Completion | Context | Stream | Tools | Struct |
|---|---|---|---|---|---|---|---|
| `claude-haiku-4-5-20251001` | Bedrock | $1 | $5 | 200K | ✓ | ✓ | ✓ |
| `claude-sonnet-4-5-20250929` | Bedrock | $3 | $15 | 200K | ✓ | ✓ | ✓ |
| `claude-sonnet-4-6` | Bedrock | $3 | $15 | 200K | ✓ | ✓ | ✓ |
| `claude-sonnet-5` | Bedrock | $3 | $15 | 200K | ✓ | ✓ | ✗ |
| `claude-opus-4-5-20251101` | Bedrock | $5 | $25 | 200K | ✓ | ✓ | ✓ |
| `claude-opus-4-6` | Bedrock | $5 | $25 | 200K | ✓ | ✓ | ✓ |
| `claude-opus-4-7` | Bedrock | $5 | $25 | 1M | ✓ | ✓ | ✗ |
| `claude-opus-4-8` | Bedrock | $5 | $25 | 1M | ✓ | ✓ | ✗ |
| `claude-opus-5` | Bedrock | $5 | $25 | 200K | ✓ | ✓ | ✗ |
| `gpt-4.1` | OpenAI | $2 | $8 | 1M | ✓ | ✓ | ✗ |
| `gpt-5` | OpenAI | $1.25 | $10 | 400K | ✓ | ✓ | ✓ |
| `gpt-5-nano` | OpenAI | $0.05 | $0.4 | 400K | ✓ | ✓ | ✓ |
| `gpt-5-mini` | OpenAI | $0.25 | $2 | 400K | ✓ | ✓ | ✓ |
| `gpt-5.1` | OpenAI | $1.25 | $10 | 400K | ✓ | ✓ | ✓ |
| `gpt-5.2` | OpenAI | $1.75 | $14 | 400K | ✓ | ✓ | ✓ |
| `gpt-5.5` | OpenAI | $5 | $30 | 272K | ✓ | ✓ | ✓ |
| `gpt-5.6-luna` | OpenAI | $1 | $6 | 270K | ✓ | ✓ | ✓ |
| `gpt-5.6-terra` | OpenAI | $2.5 | $15 | 270K | ✓ | ✓ | ✓ |
| `gpt-5.6-sol` | OpenAI | $4 | $20 | 270K | ✓ | ✓ | ✓ |
| `gemini-2.5-flash-lite` | Vertex | $0.1 | $0.4 | 1M | ✓ | ✓ | ✓ |
| `gemini-2.5-flash` | Vertex | $0.3 | $2.5 | 1M | ✓ | ✓ | ✓ |
| `gemini-2.5-pro` | Vertex | $1.25 | $10 | 200K | ✓ | ✓ | ✓ |
| `gemini-3.1-flash-lite` | Vertex | $0.25 | $1.5 | 1M | ✓ | ✓ | ✓ |
| `gemini-3.5-flash-lite` | Vertex | $0.3 | $2.5 | 1M | ✓ | ✓ | ✓ |
| `gemini-3.5-flash` | Vertex | $1.25 | $9 | 1M | ✓ | ✓ | ✓ |
| `gemini-3.6-flash` | Vertex | $1.5 | $7.5 | 1M | ✓ | ✓ | ✓ |
| `gemini-3.7-flash` | Vertex | $0.75 | $3.75 | 1M | ✓ | ✓ | ✓ |
| `qwen3.5-4b-32k-fast` | AssemblyAI | $0.1 | $0.5 | 32K | ✓ | **✗** | **✗** |
| `qwen3-32B` | Bedrock | $0.15 | $0.6 | 200K | ✓ | ✓ | ✓ |
| `qwen3-next-80b-a3b` | Bedrock | $0.15 | $1.2 | 200K | ✓ | ✓ | ✓ |
| `gemma-4-31b` | Bedrock Mantle | $0.14 | $0.4 | 256K | ✓ | ✓ | ✓ |
| `gpt-oss-120b` | Bedrock | $0.15 | $0.6 | 131K | **✗** | ✓ | ✓ |
| `gpt-oss-20b` | Bedrock | $0.07 | $0.3 | 131K | **✗** | ✓ | ✗ |

The traps in that table: `qwen3.5-4b-32k-fast` (the cheapest and fastest, and the default in the documentation's examples) **cannot do tool calling or structured outputs**. The `gpt-oss-*` models **cannot stream**. For a voice agent with tools, take `gemini-2.5-flash`/`gemini-3.5-flash-lite` or `gpt-5-mini`/`claude-haiku-4-5`.

---

## Models and languages

Sources: https://www.assemblyai.com/pricing, https://www.assemblyai.com/products/streaming-speech-to-text, https://www.assemblyai.com/blog/introducing-multilingual-universal-streaming

### Realtime / streaming

| Model | ID | Latency | Languages | Price |
|---|---|---|---|---|
| **Universal-3.5 Pro Realtime** | `universal-3-5-pro` (in pricing as `u3-rt-pro`) | **~150 ms P50** for both partial and final | **18** | $0.45/hr |
| Universal-Streaming English | `universal-streaming-english` | — | en | $0.15/hr |
| Universal-Streaming Multilingual | `universal-streaming-multilingual` | — | **6** | $0.15/hr |
| Whisper-Streaming | — | — | — | — |

**The 18 languages of Universal Pro:** English, Spanish, French, German, Italian, Portuguese, Arabic, Danish, Dutch, Finnish, Hebrew, Hindi, Japanese, Mandarin, Norwegian, Swedish, Turkish, Vietnamese. There is native **code-switching** (changing language mid-phrase).

**The 6 languages of Multilingual:** English, Spanish, French, German, Italian, Portuguese. This is the cost-optimised variant.

Universal-3.5 Pro Realtime is positioned as the "highest-accuracy real-time model".

### Async / pre-recorded

| Model | ID | Price |
|---|---|---|
| Universal-3.5 Pro | `universal-3-5-pro` | $0.21/hr |
| Universal-2 | `universal-2` | $0.15/hr |

Async billing is by the hours of audio submitted (unlike streaming).

### Voice Agent API

Universal-3.5 Pro ASR under the hood. Latency **~1 s end to end**. Voices: 18 English plus 16 multilingual.

---

## Prices, credits, limits

Source: https://www.assemblyai.com/pricing

**Free tier:** **$50 of free credit** on registration, with no card required.

| Product | Price |
|---|---|
| Voice Agent API (everything included) | **$4.50/hr** = $0.075/min |
| Streaming: Universal-3.5 Pro Realtime | $0.45/hr |
| Streaming: Universal-Streaming (EN / Multilingual) | $0.15/hr |
| Async: Universal-3.5 Pro | $0.21/hr |
| Async: Universal-2 | $0.15/hr |
| LLM Gateway | per token, see the table above |

**Add-ons (they stack on top of the base rate):**
- Medical Mode: +$0.15/hr
- Speaker Diarization (async, standard): +$0.02/hr
- Entity Detection: +$0.08/hr
- Topic Detection: +$0.15/hr

**Limits:**
- Streaming concurrency (new sessions per minute): **5** on the free tier, **100** on paid. The limits rise automatically with usage volume.
- LLM Gateway: per model, requests / 60 s.
- The maximum length of a streaming session: **3 hours** (automatic closing).

**The economics of $50 of credit at a hackathon:** the Voice Agent API gives about 11 hours of conversation ($50 / $4.50). A hand-assembled pipeline (U-3.5 Pro Realtime + Gemini Flash + a third-party TTS) is ten times cheaper on STT ($0.45/hr → about 111 hours), but requires writing the orchestration, the turn-taking and the barge-in yourself. For a 24–48 hour hackathon the Voice Agent API almost always wins on development time.

---

## What matters for a hackathon

### 1. The key never reaches the browser

The API key lives on the server only. The browser gets a single-use token from its own backend:

- Voice Agent: `GET https://agents.assemblyai.com/v1/token?expires_in_seconds=300` with `Authorization: Bearer <key>`.
- Streaming STT: `GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=60` with `Authorization: <key>` (**no Bearer**).

The token is single-use — every reconnect needs a new one. Build the retry into the UI in advance: "get a token → open the socket", not "open the socket with a cached token".

**Three different header formats — the most frequent cause of a 401:**

| API | Header |
|---|---|
| Streaming STT | `Authorization: <API_KEY>` |
| Voice Agent API | `Authorization: Bearer <API_KEY>` |
| LLM Gateway | `authorization: Bearer <API_KEY>` |

### 2. Browser audio: AudioWorklet + 16-bit PCM

**Set the sample rate explicitly when creating the AudioContext.** Otherwise the browser will hand you 44.1 or 48 kHz and you will get a "chipmunk on fast-forward" or garbage:

```javascript
audioCtx = new AudioContext({ sampleRate: 24000 });   // Voice Agent API
// audioCtx = new AudioContext({ sampleRate: 16000 }); // Streaming STT
```

Capture goes in an AudioWorklet, not in the deprecated `ScriptProcessorNode` (which runs on the main thread and drops frames on any UI repaint):

```javascript
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    const pcm = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}
```

**Clipping to [-1, 1] before the multiplication** is mandatory, as are the **asymmetric multipliers** `0x8000` for negative values and `0x7FFF` for positive ones — otherwise you get overflow and clicks on loud peaks.

Sending (Voice Agent — base64 in JSON):

```javascript
ws.send(JSON.stringify({
  type: "input.audio",
  audio: arrayBufferToBase64(e.data),
}));
```

For Streaming STT it is the opposite, a **binary frame**: `ws.send(pcmArrayBuffer)`. These must not be confused; they are different protocols.

### 2a. The echo loop: the agent hears itself and interrupts itself

This is not theory. A hackathon entrant has already failed on it: the terminal client of claim-intake-agent warns that **without headphones the agent hears itself and interrupts every utterance** — there is no AEC there at all, and a judge on macOS simply will not get through that path (the claim-intake-agent breakdown).

The mechanics of the failure: the agent speaks through the speakers → the microphone captures its own voice → `input.speech.started` fires on the agent's voice → playback is flushed → the agent falls silent because of itself. In our case it is worse: the STT socket will return a phantom `Turn`, and words the user never spoke enter the provenance.

Three layers of defence, and all three are needed:

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
});
```

The first layer is the browser's AEC through `getUserMedia`. It is mandatory but not sufficient: it suppresses rather than eliminates, and on a loud speaker the residue gets through.

The second layer is that **the capture node is not routed to the output**. `source.connect(worklet)` and nothing more; no `worklet.connect(audioCtx.destination)`. The mistake looks harmless (people add it so they can "hear themselves") and creates a direct loop. Exactly this is noted separately as done correctly in VoiceMed: their capture worklet is never routed to the speakers.

The third layer is a **gate for the duration of the agent's speech**. While the agent is talking, audio still goes to the STT socket (otherwise we would lose real interruption), but turns arriving inside the playback window are marked as suspect and take no part in provenance if they match the text of the agent's own utterance. A cheap check: hold the last `transcript.agent` line and compare it with the incoming `Turn`.

For clean latency measurements all of this is critical in its own right: a phantom turn shifts turn-to-turn by an amount that has nothing to do with the API.

### 3. Playback: schedule sequentially, otherwise it overlaps

`reply.audio` chunks must be queued by time rather than played as they arrive:

```javascript
const buffer = audioCtx.createBuffer(1, float.length, 24000);
buffer.getChannelData(0).set(float);
source.start(playbackTime);
playbackTime += buffer.duration;
```

And keep a list of `scheduledSources`, so there is something to stop on a barge-in (see `flushPlayback()` above). Without that the agent keeps talking into the buffer for several more seconds after being interrupted — which reads visually as "it does not react to interruption".

### 4. Tool arguments and results

`arguments` arrives as an object; `result` is sent as a JSON **string**. The asymmetry is
real and easy to miss.

Nothing else about tool timing applies to this product, because our tools are server-side
over HTTPS. The client-side dance — queue the result, send it only once `reply.done`
arrives with `status: "completed"`, discard the queue on `interrupted` — is the shape a
browser-side tool implementation has to get right, and the section below on why we do not
have that race explains what it buys us to avoid it.

### 5. What else breaks in production

- **Unclosed sockets burn money.** Streaming STT is billed by the time the connection is open. Forget `{"type":"Terminate"}` when the user leaves the page and the session hangs for up to three hours and is billed in full. Hang `Terminate` on `beforeunload` and on a server-side inactivity timeout (`inactivity_timeout`, 5–3600 s).
- **Concurrency of 5/min on the free tier.** Five people at the demo stand press "Talk" at once and the sixth gets an error. If the demo is public, add a queue or move to paid in advance.
- **`greeting` and `output` are immutable.** A voice switcher in the UI will require reopening the session. Design the UI with that in mind.
- **`qwen3.5-4b-32k-fast` from the documentation's examples does not support tool calling.** If the agent "ignores the tools", check the model against the capabilities table.
- **`session.resume` lives for 30 seconds.** Save the `session_id` from `session.ready` immediately; when the Wi-Fi drops you have 30 s to reconnect with the conversation context preserved, and after that only a fresh session from scratch.
- **`vad_threshold` works "backwards":** a lower value means more sensitive. In a noisy hackathon hall, raise it (0.6–0.7) and enable `voice_focus: "far-field"` for Streaming STT, or the agent will react to other people's conversations.
- **Do not touch `min_silence`/`max_silence` on the agent socket for the sake of demo responsiveness.** An earlier instruction in this file advised 500/2000 instead of the default 1000/3000 "for the stage" and did not name the price. The price is named in the Turn detection section above: setting `min_silence` or `max_silence` turns off adaptive pacing and entity-aware waiting **for the rest of the session** — documented by the vendor verbatim. In our domain this is exactly the case that must not be turned off: a nine-digit NPI or DEA dictated in groups with pauses. If a more responsive pause is needed specifically on stage, touch `vad_threshold`; it is not part of the disabling. For Streaming STT there is `mode: "min_latency"`, and there `min_turn_silence`/`max_turn_silence` work the other way round — they widen the window rather than disabling it, see the section above.
- **Telephony is a different sample rate.** SIP/Twilio means `audio/pcmu` @ 8 kHz, not 24 kHz PCM. Do not reuse the browser audio code.
- **Pre-signed links to session artifacts do not live long.** Store the `session_id`, not the URL of the recording.
- **Domain biasing costs five minutes and noticeably raises the quality of the demo.** Add names, product names and jargon to `input.keyterms` (Voice Agent) or `keyterms_prompt` (Streaming STT, up to 100 terms).

## The provenance of every fact in this file

This section was added after the check on 17.09: the vendor documents **not a single WebSocket
close code** — the streaming API reference page contains no table of codes
at all. That forced a review not only of the codes but of every number about timings: some
of them came from the documentation's prose, some we measured ourselves, and some were taken from reports
by other teams. To a reader these are indistinguishable unless they are labelled.

| Category | What it means | How to read it |
|---|---|---|
| **Documented** | Present in the vendor's published reference, with the page named | Can be presented as specification |
| **Measured by us** | Our own run, with the date and the command named | An observation on one configuration, not a guarantee |
| **Documentation prose** | The claim appears in the vendor's text, but not in a parameter or code table | Cannot be quoted as an API contract |
| **Another team's measurement** | An observation by another team, with the source named | Not re-checked by us |

Applied to the numbers about timings and closing:

| Fact | Category | Source |
|---|---|---|
| `expires_in_seconds` 1–600, `max_session_duration_seconds` 60–10800 | **Documented** | The parameters of the token endpoints |
| Chunks of 50–1000 ms, otherwise a close | **Documentation prose** | The text about the audio format; there is no table of codes |
| Code 1000 on a normal close | **Measured by us** | All 60 sessions of the held-out run, at a 24-second interval |
| Code 1008 on exceeding the new-session limit | **Measured by us** | A run at one-second intervals: **21 of 40 sockets closed with 1008**. The 3009 documented for this condition did not appear **even once** |
| Code 3006 on a malformed `keyterms_prompt` format | **Another team's measurement** | A report from another team in the field |
| Codes 3007, 3008, 3009 | **Documentation prose** | The vendor's text, not a table of codes |
| A session closes after 3 hours | **Documentation prose** | The limits section; the automatic close is not confirmed by a run of ours |
| The agent socket hangs for ~30 s after the client is lost | **Measured by us** | An observation on a forgotten tab; one measurement, not a series |
| ~60 s to the socket closing with no audio | **Measured by us** | A single observation; **the exact value is not established and no interval was measured** |
| `session.resume` lives for 30 s | **Documented** and confirmed externally | The vendor's reference plus an independent implementation: MockMate (`static/js/app.js`, lines 141 and 443) stores the `session_id` from `session.ready` and reuses it in `session.resume` on reconnect at two separate recovery points — the same window, fixed in someone else's code and not only in our reading of the doc |
| 5 new sessions per minute on the free tier | **Documentation prose** | The limits section; we did measure the violation — it closes with **1008** |
| `min_silence`/`max_silence` turn off adaptive pacing and entity-aware waiting until the end of the session | **Documented** | turn-detection-and-interruptions, a verbatim quotation, read 17.09.2026 |
| `min_turn_silence` 400 ms / `max_turn_silence` 1280 ms, the Streaming STT defaults | **Documented** | The same page, read 17.09.2026 |
| Restoration of adaptive pacing by a subsequent `session.update` without those fields | **Unconfirmed** | The vendor's wording does not cover this case explicitly; it requires a paid run, and there has not been one |

Two numbers in that table are labelled as a single observation rather than as a measurement: the 30 s
of the agent socket hanging and the ~60 s to a close with no audio. They affect the calculation of
credit spend, so they are kept, but no interval has been built under them and they must not be passed
off as a measured quantity.

## Noticed in other teams' work, not verified by us

Parameters and behaviours encountered in other people's implementations while scanning the field.
**We have checked none of them with a run of our own** — the list exists so that they do not have to be
found again, and every row is marked as unconfirmed.

| Parameter or behaviour | Where it was noticed | Why it might be needed |
|---|---|---|
| `transcription_mode`: `max_accuracy` / `min_latency` | Another team's socket configuration | A direct knob for the accuracy/latency trade-off; we have no such knob |
| `output.volume` | An agent configuration | Reply volume without rebuilding the graph |
| `interrupt_response` plus `interruption_delay: 150` | An agent configuration | Controlled interruption instead of hard half-duplex |
| `reply.done` with `status: "interrupted"` | An observation in someone else's log | Distinguishing a completed reply from an interrupted one; we do not currently distinguish them |
| `voice_focus` and `voice_focus_threshold` | A socket configuration | We already use the first; not the threshold |
| `dtmf_collected_arguments` plus `sensitive: true` | A tool configuration | Collecting digits by tone with a sensitivity flag; relevant for DEA and NPI |
| `end_of_turn_confidence_threshold` | A socket configuration | A confidence threshold for the end of a turn, rather than silence alone |
| `language_codes` against code-switching | Someone else's bug report: an English phrase came back in **Japanese katakana** | Pinning the language explicitly as a defence against a substituted writing system |
| `llm[]` in the LLM Gateway | Another team's configuration | Model selection and fallback at the gateway level |

## Why our tools are server-side: the `tool.result` against `reply.done` race does not exist

The argument had not been written down anywhere, although it determines the architecture.

When tools are called from the browser, the client is obliged to send `tool.result` and obliged to
do so at the right moment relative to `reply.done`. Send it too early and the agent is
still speaking, so the result arrives into a state it is not expecting; send it too late and the
agent has already moved on to the next utterance without the result. On top of that the client holds
the audio output, meaning it has to order two asynchronous queues relative to each
other.

Our tools are declared with `http.url`, and **AssemblyAI calls them from its own side**.
There is no `tool.call` in the client, no `tool.result`, and no need to order them:
each invocation is an ordinary short HTTPS request to one of our routes. Hence the suitability of
serverless: the function lives for the milliseconds of the call, not the minutes of the session.

The price of that choice is named honestly: the host must be publicly reachable over HTTPS, localhost and
private ranges are rejected, so tools are debugged on a preview deployment or
through a tunnel; the response is truncated at 8 KiB; the headers are write-only, and that is
where the shared secret goes.

## `session.end` is a one-way door, and an interruption is not

A distinction on which a bug is easy to build.

**An interruption** resets the state of the current reply and sends an empty
`input.audio`. The session stays alive, the context is preserved and the conversation continues.

**`session.end` is irreversible.** After it there is no `session.resume` and no reuse
of the `session_id`: the thirty-second resume window works after a **dropped
connection**, not after an explicit termination. The Stop button in the interface is exactly
`session.end`, and that is correct, but it means that an accidental press costs a whole new
session rather than a reconnect. The token for a new session also has to be fresh: tokens are single-use.

## Unconfirmed / needs checking

- The full list of Voice Agent API `voice_id` values — the catalogue is mentioned, but was not found in full in the docs (confirmed: `anna` as the default, `ivy`, `james`, `sophie`, `diego`, `arjun`; the count of 18 EN plus 16 multilingual).
- The exact schema of the `llm` field in `session.update` (choosing the LLM model for the built-in agent) — not detailed in the WebSocket reference; BYO-LLM is mentioned as supported through an OpenAI-compatible endpoint.
- The schema of `POST /v1/agents` (the request body when creating a reusable agent) — the endpoint is confirmed, the fields are not documented on the pages studied.
- The default values of `vad_threshold` and `interruption_delay` for Streaming STT — the docs say "mode-dependent / model-dependent" with no concrete numbers. `min_turn_silence` and `max_turn_silence` for Streaming STT are documented: 400 ms and 1280 ms respectively — taken from the turn-detection-and-interruptions section, read 17.09.2026 together with the fact about the disabling of adaptive pacing above.
- The latency of Universal-Streaming English/Multilingual and Whisper-Streaming in ms — not published (only ~150 ms P50 for Universal-3.5 Pro Realtime is confirmed).
- The exact LLM Gateway rate limits (RPM) per model — only the principle is stated, "per model, per 60-second window".
- The pages `/docs/voice-agents/tools`, `/docs/llm-gateway/models` and `/docs/speech-to-text/universal-streaming/supported-languages` returned 404 — the data on tool calling and languages was assembled from the API spec, pricing and the AssemblyAI blog.
