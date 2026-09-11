# Техническая справка: AssemblyAI для голосовых агентов

Состояние на сентябрь 2026. Источники указаны в каждом разделе.

---

## Voice Agent API

Единый speech-to-speech стек: STT + LLM + TTS + turn detection + прерывания + tool calling в одном WebSocket. Не нужно сшивать отдельных провайдеров и оркестратор. Заявлено `PCI-certified end-to-end`.

Источники:
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/api-spec/voice-agent-websocket
- https://www.assemblyai.com/products/voice-agent-api
- https://www.assemblyai.com/blog/raw-websocket-voice-agent-voice-agent-api

### Эндпоинт и аутентификация

```
wss://agents.assemblyai.com/v1/ws
```

Два способа аутентификации:

1. Сервер-сайд — заголовок (браузер так не умеет, заголовки в WebSocket из JS не задаются):
```
Authorization: Bearer YOUR_ASSEMBLYAI_API_KEY
```

2. Браузер — одноразовый временный токен в query-параметре:
```
GET https://agents.assemblyai.com/v1/token?expires_in_seconds=300
Authorization: Bearer YOUR_ASSEMBLYAI_API_KEY
→ { "token": "..." }

wss://agents.assemblyai.com/v1/ws?token=<token>
```

Минтинг токена на бэкенде (Express), эталонный паттерн:

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

REST API для управления сессиями и агентами:

```
POST https://agents.assemblyai.com/v1/agents          # создать переиспользуемого агента
GET  https://agents.assemblyai.com/v1/sessions?limit=5
GET  https://agents.assemblyai.com/v1/sessions/$SESSION_ID
```

Артефакты сессии (по `GET /v1/sessions/{id}`): `audio` (OGG/Opus), `timeline` (JSON-лог, пары `user_transcript` ↔ `agent_text`), `metadata` (JSON). Ссылки на скачивание — pre-signed с коротким TTL; хранить `session_id` и запрашивать свежие ссылки заново, не кэшировать URL.

### Формат аудио

Три варианта кодирования, задаются в `input.format.encoding` и `output.format.encoding`:

| encoding | Описание | Sample rate |
|---|---|---|
| `audio/pcm` | PCM16, 16-bit signed little-endian, mono (по умолчанию) | 24 000 Hz |
| `audio/pcmu` | G.711 μ-law, mono (телефония) | 8 000 Hz |
| `audio/pcma` | G.711 A-law, mono (телефония) | 8 000 Hz |

Аудио передаётся **не бинарными фреймами**, а base64 внутри JSON-сообщения `input.audio`. Это отличие от Streaming STT.

Рекомендуемый размер чанка — **~50 мс**. Требование не жёсткое: сервер буферизует и склеивает чанки.

### Протокол: события и сообщения

Порядок: открыть сокет → первым сообщением отправить `session.update` → дождаться `session.ready` → стримить `input.audio`.

**Клиент → сервер (6 типов)**

```json
{
  "type": "session.update",
  "session": {
    "agent_id": "string (опционально)",
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
    "tools": [ /* см. раздел Tool calling */ ]
  }
}
```

```json
{ "type": "input.audio", "audio": "base64_encoded_pcm_bytes" }
{ "type": "tool.result", "call_id": "string", "result": "JSON_encoded_string" }
{ "type": "session.resume", "session_id": "string" }
{ "type": "reply.create", "instructions": "string (опционально)" }
{ "type": "session.end" }
```

`reply.create` — заставить агента заговорить самому (one-shot инструкция, `system_prompt` не меняется). Полезно для проактивных реплик и таймаутов молчания.

**Сервер → клиент (12+ типов)**

| Событие | Поля | Что делать |
|---|---|---|
| `session.ready` | `type`, `session_id` | сохранить `session_id` для `session.resume` |
| `session.updated` | `type` | конфиг применён |
| `input.speech.started` | `type` | пользователь заговорил — можно гасить плейбек |
| `input.speech.stopped` | `type` | конец речи пользователя |
| `transcript.user.delta` | `type`, `text` | частичный транскрипт (для live-субтитров) |
| `transcript.user` | `type`, `text`, `item_id` | финальный транскрипт реплики пользователя |
| `reply.started` | `type`, `reply_id` | агент начал отвечать |
| `reply.audio` | `type`, `data` (base64) | чанк TTS-аудио — декодировать и проигрывать |
| `transcript.agent` | `type`, `text`, `reply_id`, `item_id`, `interrupted` (bool) | полный текст ответа агента |
| `reply.done` | `type`, `status`: `"completed"` \| `"interrupted"` | конец ответа; барьер для отправки tool.result |
| `tool.call` | `type`, `call_id`, `name`, `arguments` (объект, уже распарсен) | выполнить функцию |
| `session.error` / `error` | `type`, `code`, `message`, опц. `timestamp`, `param` | обработать ошибку |
| `session.ended` | `type`, `session_duration_seconds`, `timestamp`, опц. `audio_duration_seconds` | закрытие |

### Tool calling (JSON Schema)

Инструменты объявляются в `session.tools`. Схема близка к OpenAI function calling, но плоская (`name`/`description`/`parameters` на верхнем уровне объекта, без вложенного `function`).

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

- `execution_mode`: `interactive` (по умолчанию) — агент продолжает говорить, пока ждёт; `hold` — держит паузу.
- `timeout_seconds`: 1–300, по умолчанию 120.
- Также поддерживаются **server-side HTTP tools**: инструменту задаётся HTTP-эндпоинт, AssemblyAI сам его вызывает и подставляет ответ в разговор — клиенту ничего делать не надо.

**Критичный паттерн: аккумулировать результаты и отправлять только на `reply.done`.** Отправка `tool.result` раньше — самая частая ошибка.

```python
pending_tools = []

if event_type == "tool.call":
    result = execute_tool(event["arguments"])
    pending_tools.append({"call_id": event["call_id"], "result": result})

elif event_type == "reply.done":
    if event.get("status") == "interrupted":
        pending_tools.clear()          # барж-ин: выбросить, пользователь передумал
    else:
        for tool in pending_tools:
            send({"type": "tool.result",
                  "call_id": tool["call_id"],
                  "result": json.dumps(tool["result"])})
        pending_tools.clear()
```

Обратите внимание: `arguments` в `tool.call` приходит **готовым объектом/dict**, а `result` в `tool.result` надо отправлять **JSON-строкой** (`json.dumps`). Асимметрия.

### Turn detection / VAD / прерывания

Всё в `session.input.turn_detection`:

| Параметр | Диапазон | Default | Смысл |
|---|---|---|---|
| `vad_threshold` | 0.0–1.0 | 0.5 | чувствительность VAD; **ниже = чувствительнее** |
| `min_silence` | 50–10000 мс | 1000 | пауза, после которой начинается проверка конца реплики |
| `max_silence` | 50–10000 мс | 3000 | жёсткий конец реплики независимо от пунктуации |
| `interrupt_response` | bool | `true` | разрешить барж-ин: речь пользователя прерывает агента |

`min_silence` должен быть строго меньше `max_silence`.

Обработка прерывания на клиенте — три обязательных действия:
1. По `input.speech.started` (или по `reply.done` со `status: "interrupted"`) — **сбросить буфер воспроизведения**, остановить все запланированные `AudioBufferSourceNode`.
2. Сбросить курсор времени плейбека на `audioCtx.currentTime`.
3. Очистить `pending_tools`.

```javascript
function flushPlayback() {
  for (const src of scheduledSources) {
    try { src.stop(); } catch (_) {}
  }
  scheduledSources = [];
  playbackTime = audioCtx.currentTime;
}
```

### Параметры конфигурации

- `agent_id` и inline-поля (`system_prompt`, `greeting`, `tools`, `input`, `output`) **взаимоисключающие**. Либо привязка к сохранённому агенту из `POST /v1/agents`, либо всё инлайном.
- `greeting` и `output` **иммутабельны после `session.ready`**. Голос на ходу не поменять. Остальное (`system_prompt`, `tools`, `input.keyterms`, `turn_detection`) можно пересылать `session.update` посреди разговора.
- `session.resume` работает **30 секунд** после обрыва соединения.
- `input.keyterms` — биасинг распознавания под домен (имена, SKU, термины).
- Поддержка **custom LLM / BYO-LLM**: свой OpenAI-совместимый эндпоинт вместо встроенного.
- Голоса: **18 английских и 16 многоязычных** из каталога AssemblyAI (`anna` — default, а также `ivy`, `james` — conversational US male, `sophie` — clear UK female, `diego` — Latin American Spanish, `arjun` — Hindi/Hinglish). Это **не** ElevenLabs voice ID.
- Телефония: SIP-транк через Twilio / Telnyx — без собственного webhook и media-сервера.
- Стартеры в доках: minimal, keyterm biasing, turn-taking, byo-llm, HTTP tools, web search (Exa), CRM (Airtable), booking (Cal), DTMF/PCI.

**Латентность:** ~1 секунда end-to-end от конца реплики пользователя до начала речи агента; под капотом Universal-3.5 Pro ASR.

---

## Realtime Streaming STT

Только распознавание речи, без LLM и TTS. Нужен, если вы хотите собирать пайплайн сами (например, свой LLM + свой TTS) или вам нужны транскрипты, диаризация, PII-редакция.

Источники:
- https://www.assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio
- https://www.assemblyai.com/docs/api-reference/streaming-api/streaming-api
- https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token
- https://www.assemblyai.com/products/streaming-speech-to-text

### Эндпоинт и аутентификация

```
wss://streaming.assemblyai.com/v3/ws        # global, latency-optimized
wss://streaming.us.assemblyai.com/v3/ws     # US data residency
wss://streaming.eu.assemblyai.com/v3/ws     # EU data residency
```

Аутентификация:
- Заголовок `Authorization: <YOUR_API_KEY>` — **без префикса `Bearer`** (в отличие от Voice Agent API и LLM Gateway!).
- Или query-параметр `token=<temporary_token>` для браузера.

Минтинг временного токена:

```
GET https://streaming.assemblyai.com/v3/token
    ?expires_in_seconds=60
    &max_session_duration_seconds=3600
Authorization: <YOUR_API_KEY>

→ { "token": "<token_string>" }
```

- `expires_in_seconds`: обязательный, **1–600**.
- `max_session_duration_seconds`: опциональный, **60–10800** (по умолчанию максимум — 3 часа).
- Токен **одноразовый**, годен ровно на одну сессию. Usage списывается на исходный API-ключ.

```python
params_w_token = {**CONNECTION_PARAMS, "speech_model": "universal-3-5-pro", "token": token}
ws_app = websocket.WebSocketApp(f'{API_ENDPOINT_BASE_URL}?{urlencode(params_w_token)}')
```

### Формат аудио

- По умолчанию: **mono 16-bit PCM**, `encoding=pcm_s16le`, `sample_rate=16000`.
- Поддерживаемые `encoding`: `pcm_s16le`, `pcm_mulaw`, `opus`, `ogg_opus`, `aac` (ADTS framing).
- `sample_rate`: **8000–96000 Hz** (игнорируется для Opus/AAC — там частота в контейнере).
- Аудио отправляется **бинарными WebSocket-фреймами** (`OPCODE_BINARY`), не base64.
- Размер чанка: **50–1000 мс** аудио. В примерах доков — 4096 байт.

### Протокол: события и сообщения

**Клиент → сервер**

Аудио — бинарный фрейм. Остальное — JSON:

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

`ForceEndpoint` — принудительно закрыть текущую реплику и получить финальный транскрипт, не дожидаясь тишины. Ключевая вещь для push-to-talk и для «пользователь нажал Send».

**Сервер → клиент**

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

Тайминги `start`/`end` — **в миллисекундах**. `word_is_final` отличает уже зафиксированные слова от ещё переписываемых внутри частичного транскрипта.

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

Есть даже встроенный вызов LLM прямо из STT-сокета — `LLMGatewayResponse` (см. query-параметр `llm_gateway`):

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

### Параметры конфигурации (query params)

| Параметр | Тип | Default | Примечание |
|---|---|---|---|
| `speech_model` | string | `universal-3-5-pro` | + `universal-streaming-english`, `universal-streaming-multilingual` |
| `encoding` | string | `pcm_s16le` | `pcm_s16le`, `pcm_mulaw`, `opus`, `ogg_opus`, `aac` |
| `sample_rate` | int | 16000 | 8000–96000 |
| `language_codes` | array | — | стиринг языка, напр. `["en","es"]` |
| `language_detection` | bool | false | добавляет `language_code`/`language_confidence` в Turn |
| `mode` | string | server default | `max_accuracy` \| `min_latency` \| `balanced`; только Universal-3.5 Pro |
| `domain` | string | — | `medical-v1` для медтерминологии |
| `min_turn_silence` | int мс | зависит от mode | 50–10000 |
| `max_turn_silence` | int мс | зависит от модели | форс конца реплики |
| `end_of_turn_confidence_threshold` | float | **0.4** | 0.0–1.0 |
| `vad_threshold` | float | зависит от модели | 0.0–1.0 |
| `interruption_delay` | int мс | зависит от mode | 0–1000, до первого partial; U-3.5 Pro |
| `continuous_partials` | bool | **true** | partial каждые ~3 с в длинной реплике |
| `include_partial_turns` | bool | **true** | принудительно false при включённой PII-редакции |
| `format_turns` | bool | **false** | пунктуация/кастинг; только Universal Streaming |
| `speaker_labels` | bool | false | стриминговая диаризация |
| `max_speakers` | int | — | 1–10 |
| `voice_focus` | string | — | `near-field` \| `far-field`, шумоподавление |
| `voice_focus_threshold` | float | 0.7 | 0.0–1.0 |
| `redact_pii` | bool | false | — |
| `redact_pii_policies` | array | — | категории PII |
| `redact_pii_sub` | string | `hash` | `entity_name` \| `hash` |
| `filter_profanity` | bool | false | — |
| `prompt` | string | — | контекст, **max 1750 символов**, U-3.5 Pro |
| `keyterms_prompt` | array | — | буст распознавания, **max 100 терминов** |
| `agent_context` | string | — | предыдущая реплика агента, max 1750 символов |
| `previous_context_n_turns` | int | 5 | 0–100 |
| `session_heartbeat` | bool | false | Heartbeat каждые 5 с |
| `llm_gateway` | string | — | JSON-строка с конфигом LLM Gateway |
| `inactivity_timeout` | int сек | — | 5–3600 |

**Лимиты сессии:** сессия автоматически закрывается через **3 часа**. Биллинг — по времени, пока WebSocket открыт, **не по объёму отправленного аудио**. Незакрытая сессия висит до 3 часов и тарифицируется полностью.

---

## LLM Gateway

OpenAI-совместимый шлюз к 25+ моделям разных провайдеров по одному ключу AssemblyAI. Единый биллинг с STT, не надо заводить ключи OpenAI/Anthropic/Google.

Источник: https://www.assemblyai.com/docs/llm-gateway/quickstart, https://www.assemblyai.com/docs/llm-gateway/available-models

### Эндпоинты и аутентификация

```
https://llm-gateway.assemblyai.com/v1/chat/completions       # US (default)
https://llm-gateway.eu.assemblyai.com/v1/chat/completions    # EU
```

Заголовок: `authorization: Bearer <YOUR_API_KEY>`.

Работает штатный OpenAI SDK — меняется только `base_url`:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://llm-gateway.assemblyai.com/v1",
    api_key="<YOUR_API_KEY>",
)
```

Запрос — стандартный chat completions (`model`, `messages`, `max_tokens`). Ответ содержит дополнительное поле `request_id`, контент там же: `result["choices"][0]["message"]["content"]`.

Возможности: basic chat completions, streaming, multi-turn, structured outputs (JSON Schema с пост-обработкой), tool/function calling, agentic workflows.

Рейт-лимиты: **пер-модель, в окне 60 секунд** (запросов в минуту).

### Модели (ID, цена за 1M токенов prompt/completion, контекст, capabilities)

| Model ID | Провайдер | Prompt | Completion | Context | Stream | Tools | Struct |
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

Ловушки в таблице: `qwen3.5-4b-32k-fast` (самый дешёвый и быстрый, дефолт в примерах доков) **не умеет tool calling и structured outputs**. `gpt-oss-*` **не умеют стриминг**. Для голосового агента с инструментами берите `gemini-2.5-flash`/`gemini-3.5-flash-lite` или `gpt-5-mini`/`claude-haiku-4-5`.

---

## Модели и языки

Источники: https://www.assemblyai.com/pricing, https://www.assemblyai.com/products/streaming-speech-to-text, https://www.assemblyai.com/blog/introducing-multilingual-universal-streaming

### Realtime / streaming

| Модель | ID | Латентность | Языки | Цена |
|---|---|---|---|---|
| **Universal-3.5 Pro Realtime** | `universal-3-5-pro` (в pricing как `u3-rt-pro`) | **~150 мс P50** для partial и final | **18** | $0.45/hr |
| Universal-Streaming English | `universal-streaming-english` | — | en | $0.15/hr |
| Universal-Streaming Multilingual | `universal-streaming-multilingual` | — | **6** | $0.15/hr |
| Whisper-Streaming | — | — | — | — |

**18 языков Universal Pro:** English, Spanish, French, German, Italian, Portuguese, Arabic, Danish, Dutch, Finnish, Hebrew, Hindi, Japanese, Mandarin, Norwegian, Swedish, Turkish, Vietnamese. Есть нативный **code-switching** (переключение языка посреди фразы).

**6 языков Multilingual:** English, Spanish, French, German, Italian, Portuguese. Это cost-optimized вариант.

Universal-3.5 Pro Realtime позиционируется как «highest-accuracy real-time model».

### Async / pre-recorded

| Модель | ID | Цена |
|---|---|---|
| Universal-3.5 Pro | `universal-3-5-pro` | $0.21/hr |
| Universal-2 | `universal-2` | $0.15/hr |

Биллинг async — по часам поданного аудио (в отличие от streaming).

### Voice Agent API

Под капотом Universal-3.5 Pro ASR. Латентность **~1 с end-to-end**. Голоса: 18 английских + 16 многоязычных.

---

## Цены, кредиты, лимиты

Источник: https://www.assemblyai.com/pricing

**Free tier:** **$50 бесплатных кредитов** при регистрации, карта не нужна.

| Продукт | Цена |
|---|---|
| Voice Agent API (всё включено) | **$4.50/hr** = $0.075/min |
| Streaming: Universal-3.5 Pro Realtime | $0.45/hr |
| Streaming: Universal-Streaming (EN / Multilingual) | $0.15/hr |
| Async: Universal-3.5 Pro | $0.21/hr |
| Async: Universal-2 | $0.15/hr |
| LLM Gateway | per-token, см. таблицу выше |

**Add-ons (складываются с базовой ставкой):**
- Medical Mode: +$0.15/hr
- Speaker Diarization (async, standard): +$0.02/hr
- Entity Detection: +$0.08/hr
- Topic Detection: +$0.15/hr

**Лимиты:**
- Streaming concurrency (новых сессий в минуту): **5** на free tier, **100** на paid. Лимиты автоматически растут с объёмом использования.
- LLM Gateway: пер-модель, requests / 60 s.
- Максимальная длительность streaming-сессии: **3 часа** (автозакрытие).

**Экономика $50 кредитов на хакатоне:** Voice Agent API даёт ~11 часов разговора ($50 / $4.50). Собранный вручную пайплайн (U-3.5 Pro Realtime + Gemini Flash + сторонний TTS) по STT дешевле в 10 раз ($0.45/hr → ~111 часов), но требует писать оркестрацию, turn-taking и барж-ин самому. Для 24–48-часового хакатона Voice Agent API почти всегда выигрышнее по времени разработки.

---

## Что важно для хакатона

### 1. Ключ никогда не попадает в браузер

API-ключ живёт только на сервере. Браузер получает одноразовый токен со своего же бэкенда:

- Voice Agent: `GET https://agents.assemblyai.com/v1/token?expires_in_seconds=300` с `Authorization: Bearer <key>`.
- Streaming STT: `GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=60` с `Authorization: <key>` (**без Bearer**).

Токен одноразовый — на каждый reconnect надо новый. Заранее закладывайте в UI ретрай: «получить токен → открыть сокет», а не «открыть сокет с закэшированным токеном».

**Три разных формата заголовка — самая частая причина 401:**

| API | Заголовок |
|---|---|
| Streaming STT | `Authorization: <API_KEY>` |
| Voice Agent API | `Authorization: Bearer <API_KEY>` |
| LLM Gateway | `authorization: Bearer <API_KEY>` |

### 2. Браузерное аудио: AudioWorklet + 16-bit PCM

**Задавайте sample rate явно при создании AudioContext.** Иначе браузер отдаст 44.1 или 48 kHz и вы получите «ускоренный бурундук» или мусор:

```javascript
audioCtx = new AudioContext({ sampleRate: 24000 });   // Voice Agent API
// audioCtx = new AudioContext({ sampleRate: 16000 }); // Streaming STT
```

Захват — в AudioWorklet, не в устаревшем `ScriptProcessorNode` (тот работает на main thread и даёт дропы при любой перерисовке UI):

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

Обязательно **клиппинг в [-1, 1] до умножения** и **асимметричные множители** `0x8000` для отрицательных / `0x7FFF` для положительных — иначе переполнение и щелчки на громких пиках.

Отправка (Voice Agent — base64 в JSON):

```javascript
ws.send(JSON.stringify({
  type: "input.audio",
  audio: arrayBufferToBase64(e.data),
}));
```

Для Streaming STT — наоборот, **бинарный фрейм**: `ws.send(pcmArrayBuffer)`. Путать нельзя, это разные протоколы.

### 3. Воспроизведение: планировать последовательно, иначе накладывается

Чанки `reply.audio` надо ставить в очередь по времени, а не играть по факту прихода:

```javascript
const buffer = audioCtx.createBuffer(1, float.length, 24000);
buffer.getChannelData(0).set(float);
source.start(playbackTime);
playbackTime += buffer.duration;
```

И держать список `scheduledSources`, чтобы было что останавливать при барж-ине (см. `flushPlayback()` выше). Без этого агент продолжит говорить в буфер ещё несколько секунд после того, как его перебили — визуально «не реагирует на прерывание».

### 4. `tool.result` — только на `reply.done`

Повторю, потому что это ломается чаще всего: получили `tool.call` → выполнили → **положили в очередь** → и отправили `tool.result` только когда пришёл `reply.done` со `status: "completed"`. При `status: "interrupted"` — выбросить очередь.

Ещё: `arguments` приходит объектом, `result` отправляется JSON-**строкой**.

### 5. Что ещё ломается в продакшене

- **Незакрытые сокеты жгут деньги.** Streaming STT тарифицируется по времени открытого соединения. Забыли `{"type":"Terminate"}` при уходе пользователя со страницы — сессия висит до 3 часов и тарифицируется полностью. Вешайте `Terminate` на `beforeunload` и на серверный таймаут неактивности (`inactivity_timeout`, 5–3600 с).
- **Concurrency 5/min на free tier.** Пять человек на демо-стенде одновременно нажали «Talk» — шестой получит ошибку. Если демо публичное, ставьте очередь или переходите на paid заранее.
- **`greeting` и `output` иммутабельны.** Переключатель голоса в UI потребует переоткрытия сессии. Проектируйте UI с учётом этого.
- **`qwen3.5-4b-32k-fast` из примеров доков не поддерживает tool calling.** Если агент «игнорирует инструменты» — проверьте модель по таблице capabilities.
- **`session.resume` живёт 30 секунд.** Сохраняйте `session_id` из `session.ready` сразу; при обрыве Wi-Fi у вас есть 30 с на реконнект с сохранением контекста разговора, дальше — только новая сессия с нуля.
- **`vad_threshold` работает «наоборот»:** ниже значение = чувствительнее. В шумном зале хакатона поднимайте его (0.6–0.7) и включайте `voice_focus: "far-field"` для Streaming STT, иначе агент будет реагировать на чужие разговоры.
- **Настройте паузы под демо.** Дефолтные `min_silence: 1000` / `max_silence: 3000` ощущаются медленно на сцене. 500/2000 отзывчивее, но растёт число ложных прерываний. Для Streaming STT есть `mode: "min_latency"`.
- **Телефония — другой sample rate.** SIP/Twilio означает `audio/pcmu` @ 8 kHz, не 24 kHz PCM. Не переиспользуйте браузерный аудио-код.
- **Pre-signed ссылки на артефакты сессии живут недолго.** Храните `session_id`, а не URL записи.
- **Биасинг под домен стоит 5 минут и заметно поднимает качество демо.** Добавьте имена, названия продуктов и жаргон в `input.keyterms` (Voice Agent) или `keyterms_prompt` (Streaming STT, до 100 терминов).

### 6. Быстрый выбор архитектуры

- Нужен работающий голосовой агент за пару часов → **Voice Agent API**, inline-конфиг, браузерный стартер, $4.50/hr.
- Нужен свой LLM, но готовая оркестрация голоса → Voice Agent API + **BYO-LLM** (OpenAI-совместимый эндпоинт) или `llm` через LLM Gateway.
- Нужны транскрипты, диаризация, PII-редакция, или очень нестандартный пайплайн → **Streaming STT v3** + LLM Gateway + свой TTS. Дешевле по STT, но turn-taking и барж-ин пишете сами.
- Промежуточный вариант: Streaming STT с query-параметром `llm_gateway` — LLM вызывается прямо из STT-сокета, ответ приходит как `LLMGatewayResponse`. Без своего оркестратора, но TTS всё равно ваш.

---

## Не подтверждено / требует проверки

- Полный список `voice_id` голосов Voice Agent API — каталог упоминается, но целиком в доках не найден (подтверждены: `anna` default, `ivy`, `james`, `sophie`, `diego`, `arjun`; количество 18 EN + 16 multilingual).
- Точная схема поля `llm` в `session.update` (выбор модели LLM для встроенного агента) — в WebSocket reference не детализирована; BYO-LLM упоминается как поддерживаемый через OpenAI-совместимый эндпоинт.
- Схема `POST /v1/agents` (тело запроса при создании переиспользуемого агента) — эндпоинт подтверждён, поля не документированы в изученных страницах.
- Дефолтные значения `min_turn_silence`, `max_turn_silence`, `vad_threshold`, `interruption_delay` для Streaming STT — в доках указано «mode-dependent / model-dependent» без конкретных чисел.
- Латентность Universal-Streaming English/Multilingual и Whisper-Streaming в мс — не опубликована (подтверждено только ~150 мс P50 для Universal-3.5 Pro Realtime).
- Точные значения LLM Gateway rate limits (RPM) по моделям — указан только принцип «per model, per 60-second window».
- Страницы `/docs/voice-agents/tools`, `/docs/llm-gateway/models`, `/docs/speech-to-text/universal-streaming/supported-languages` вернули 404 — данные по tool calling и языкам собраны из API-spec, pricing и блога AssemblyAI.
