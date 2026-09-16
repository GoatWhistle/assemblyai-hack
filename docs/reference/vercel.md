# Голосовой агент целиком на Vercel: проверка по актуальным докам (15 сентября 2026)

Все утверждения проверены по докам, датированным 2026-08…2026-09. Ключевое изменение против «памяти»: **22 июня 2026 Vercel открыл публичную бету WebSocket в Vercel Functions** — исторический запрет снят.

---

## Вопрос 1 — Может ли Vercel держать исходящий (outbound) WebSocket из серверного кода?

**Вердикт: да, технически может — внутри одного вызова функции, до 300 с на Hobby и до 800 с (бета 1800 с) на Pro. Соединение НЕ живёт между запросами: оно умирает вместе с вызовом функции.**

Лимиты max duration с Fluid compute (https://vercel.com/docs/functions/limitations):

| План | Default | Maximum | Extended maximum |
|---|---|---|---|
| Hobby | 300 с | **300 с** (потолок) | — |
| Pro | 300 с | **800 с** (GA) | 1800 с (бета, только per-function config) |
| Enterprise | 300 с | 800 с | 1800 с (бета) |

- **Fluid Compute: GA, причём по умолчанию** для всех проектов, созданных с 23 апреля 2025 (https://vercel.com/docs/functions/websockets — раздел «Limits and pricing»; https://vercel.com/docs/fluid-compute). Это не опция, а текущая база.
- **Node.js Functions на Fluid** — «Full Node.js coverage» API (https://vercel.com/docs/functions/limitations#api-support). Значит `ws`/`WebSocket` как клиент доступен. Отдельной доки «outbound WS разрешён» нет — см. пометку ниже.
- **Edge runtime** — жёстче: ответ должен начать отдаваться за 25 с, стриминг до 300 с (https://vercel.com/docs/functions/limitations#edge-runtime). Для двух долгих сокетов не годится.
- **Соединение между запросами**: прямо запрещено архитектурно. «Established connections are pinned to the Function for its maximum duration. Future connections are not guaranteed to connect to the same Function» (https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections). То же в основной доке: состояние держать во внешнем сторе, не в памяти (https://vercel.com/docs/functions/websockets — «Manage persistent state»).
- **Vercel Sandbox** — есть, и это отдельное предложение под ровно нашу задачу: «isolated compute environments that can run long-running processes», «can maintain websocket connections and run processes for extended periods», Docker не нужен (клонирует git-репозиторий и ставит runtime, напр. python3.13), таймаут по умолчанию 10 минут, конфигурируемый (https://vercel.com/kb/guide/how-to-build-an-on-demand-voice-agent-with-vercel-sandbox). Модель — ephemeral per-session, не always-on.
- **Vercel Workflows** — для «unlimited execution time» Vercel отправляет в Workflows (https://vercel.com/docs/workflows), но это durable-шаги с паузами, а не держание сокета. Для realtime-аудио не подходит.

> **НЕ ПРОВЕРЕНО ПО ДОКЕ:** явного утверждения «Vercel Function может открыть исходящий WebSocket к сторонному серверу» в доках нет. Вывод сделан из «Full Node.js coverage» + того, что Sandbox-гайд явно упоминает outbound WS. Риск низкий, но это единственный пункт отчёта без прямой цитаты.

**Важная деталь для нашего кейса:** сессия 2-10 минут = 120-600 с. На Hobby потолок 300 с — 10-минутная сессия **рвётся на середине**. Нужен Pro (800 с) либо реконнект.

---

## Вопрос 2 — Поддерживает ли Vercel входящие WebSocket (браузер → функция)?

**Вердикт: да. Публичная бета с 22 июня 2026, требует Fluid compute (включён по умолчанию). Работает на Node.js, Bun и Python — в том числе FastAPI-эндпоинт `@app.websocket`.**

Доки: https://vercel.com/docs/functions/websockets (last_updated 2026-08-10), анонс https://vercel.com/changelog/websocket-support-is-now-in-public-beta (22.06.2026), Python-анонс https://vercel.com/changelog/websocket-support-is-now-available-for-python-functions.

Что поддерживается:
- Node.js: `ws`, Socket.IO, Express, Hono, h3, Nitro — без Vercel-специфичной конфигурации.
- Next.js: нет родного API для upgrade, есть костыль `experimental_upgradeWebSocket()` из `@vercel/functions`.
- Python ASGI: **FastAPI `@app.websocket("/api/ws")` работает как есть**, нужен `uvicorn[standard]`/`websockets`/`wsproto`.
- Биллинг: Active CPU — платим за обработку сообщений, не за idle-соединение. Для аудио-прокси это скорее плюс.

Ограничения, критичные для нас:
1. Соединение закрывается по достижении max duration функции (300/800 с).
2. Новые соединения не гарантированно попадут в тот же инстанс — состояние в Redis/внешний стор.
3. Нет broadcast между инстансами, нет presence, нет гарантий доставки (это и не нужно для 1:1 аудио).

---

## Вопрос 3 — Есть ли официальный паттерн Vercel для realtime voice agents?

**Вердикт: да, и он ровно тот, о котором вы спрашивали: сервер минтит короткоживущий токен, браузер подключается напрямую к провайдеру по WebSocket. Vercel сам это называет каноническим путём и встроил в AI SDK 7.**

Доки:
- https://vercel.com/docs/ai-gateway/modalities/realtime
- https://vercel.com/docs/ai-gateway/getting-started/realtime
- https://vercel.com/blog/realtime-voice-agents-on-ai-gateway
- https://vercel.com/changelog/realtime-voice-speech-and-transcription-now-supported-on-ai-gateway
- https://vercel.com/blog/ai-sdk-7

Цитаты:
- «AI SDK 7 adds experimental provider-agnostic realtime support for **direct browser WebSocket sessions**».
- «The connection is authenticated with your AI Gateway credential, so **you mint a short-lived token on the server and hand the browser only that token**. Your API key never reaches the client.»
- `useRealtime` хук в браузере сам берёт микрофон, воспроизведение и WebSocket. Серверу нужен только один route для токена.
- Tool calling в этом паттерне — клиентский: «The model emits a tool call mid-reply, you run it and return the result as a client event».

**То есть да — официальный паттерн Vercel это именно «браузер подключается к провайдеру напрямую, Vercel только выдаёт токены».** Провайдеры в AI SDK 7 realtime: OpenAI, Google, xAI. AssemblyAI в этот список не входит, но нам он и не нужен: AssemblyAI даёт свой токен-эндпоинт (см. вопрос 4), архитектура идентичная.

Отдельно: есть официальный гайд «on-demand voice agent with Vercel Sandbox» (https://vercel.com/kb/guide/how-to-build-an-on-demand-voice-agent-with-vercel-sandbox), но там браузер идёт **не в sandbox**, а в LiveKit Cloud; sandbox подключается к LiveKit независимо. То есть даже в «серверном» гайде Vercel избегает схемы «браузер → долгий сокет на Vercel».

WebRTC на Vercel как терминации медиа — доки нет. **НЕ ПРОВЕРЕНО / считать отсутствующим.**

---

## Вопрос 4 — Может ли браузер подключиться НАПРЯМУЮ к обоим сокетам AssemblyAI?

**Вердикт: ДА, оба API поддерживают короткоживущие токены в query-параметре. Прокси не нужен ни для одного из двух сокетов.**

### Streaming STT v3

| Параметр | Значение |
|---|---|
| Токен-эндпоинт | `GET https://streaming.assemblyai.com/v3/token` |
| Auth для минта | заголовок `Authorization: <API_KEY>` (без Bearer) |
| `expires_in_seconds` | обязателен, 1–600 |
| `max_session_duration_seconds` | опционален, 60–10800, дефолт 3 часа |
| Подключение | `wss://streaming.assemblyai.com/v3/ws?token=<TOKEN>&sample_rate=16000&speech_model=...` |
| Ограничение | токен одноразовый, одна сессия |

Дока: https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token (также https://www.assemblyai.com/docs/universal-streaming/authenticate-with-a-temporary-token, API-reference https://assemblyai.com/docs/api-reference/streaming/create-temporary-token). Основная дока прямо предписывает: «Don't ship your API key to client-side code. Authenticate from the browser with a short-lived temporary token instead» (https://www.assemblyai.com/docs/speech-to-text/universal-streaming).

### Voice Agent API

| Параметр | Значение |
|---|---|
| Токен-эндпоинт | `GET https://agents.assemblyai.com/v1/token` |
| Auth для минта | заголовок `Authorization: Bearer <API_KEY>` |
| `expires_in_seconds` | 1–600 (рекомендуется 60–300) — это **окно на открытие сокета**, не длина сессии |
| `max_session_duration_seconds` | 60–10800 — потолок длины самой сессии |
| Подключение | `wss://agents.assemblyai.com/v1/ws?token=<TOKEN>` |
| Далее | браузер шлёт один `session.update` с `agent_id`, и промпт/голос/tools подтягиваются из stored agent |

Дока: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration. Там прямо приведён серверный роут минта (Express, 6 строк) и клиентское подключение. «No proxy required» — браузер идёт напрямую.

**Вывод: весь аудио-прокси из нашего плана можно удалить.** Два токен-роута (GET, ~50 мс) полностью заменяют его.

---

## Вопрос 5 — Что остаётся на сервере и влезает ли это в serverless?

**Вердикт: остаётся только короткие HTTPS-запросы. Voice Agent API поддерживает СЕРВЕРНЫЕ HTTP-tools — AssemblyAI сама дёргает наш вебхук, `tool.call`/`tool.result` в клиенте не нужен вообще. Это идеально ложится на serverless.**

Доки: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/overview, https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/http-tools, https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/client-side-tools

Два типа tools:
1. **HTTP tools (серверные)** — «You define these on a stored agent with a URL and parameters. **AssemblyAI makes the request for you** and feeds the result to the model.» Клиент не выполняет ничего. Нет round-trip `tool.call`/`tool.result`.
2. **Function tools (клиентские)** — inline в `session.tools`, через `tool.call` → `tool.result`.

Дока по client-side tools сама рекомендует серверный путь: «If your tool just calls an HTTP API, **prefer a server-side HTTP tool**: AssemblyAI makes the request for you and your client never handles the round trip.»

### Stored agents (обязательны для HTTP tools)

| Параметр | Значение |
|---|---|
| Эндпоинт | `POST https://agents.assemblyai.com/v1/agents` |
| Обязательные поля | `name`, `system_prompt`, `voice` |
| Tools | массив с `name`, `description`, `parameters` (JSON Schema), `http: { url, http_method }` |
| Использование | ответ содержит `id` → передаём как `agent_id` в `session.update` |

Дока: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/create-agent, управление — https://www.assemblyai.com/docs/voice-agents/voice-agent-api/manage-agents

**Ключевая оговорка: «HTTP tools work exclusively with stored agents, not inline `session.update` from browsers».** То есть агента надо создать заранее (один `curl` при деплое или в CI), инлайн из браузера HTTP-tool объявить нельзя. Для нас это не проблема, а плюс: браузер не может подменить tools.

Характеристики HTTP tools, важные для нас:
- Только HTTPS и публичные хосты; private/loopback заблокированы. Локальная разработка требует туннеля.
- Ответ обрезается на **8 KiB**.
- Заголовки в `http.headers` write-only, шифруются at rest, не возвращаются — можно положить наш shared secret.
- Маппинг аргументов: GET/DELETE → query string, POST/PUT/PATCH → JSON body.
- Non-2xx и таймауты возвращаются модели как recoverable error.
- Режимы: `interactive` (дефолт, <5 с, агент говорит переходную фразу) и `hold` (>10 с, агент молчит). **Наш валидатор/gate → `interactive`.**

### Что именно остаётся на Vercel в варианте A

| Эндпоинт | Тип | Длительность |
|---|---|---|
| `GET /api/stt-token` | минт токена STT v3 | ~50 мс |
| `GET /api/agent-token` | минт токена Voice Agent | ~50 мс |
| `POST /api/tools/confirm-order` | HTTP tool webhook от AssemblyAI | <1 с |
| `POST /api/session/finalize` | приём транскрипта/метрик от браузера | <1 с |
| `GET /api/session/:id` | чтение результата | <1 с |

Всё — короткие запросы. **Serverless подходит идеально, никакого always-on.**

---

## Вопрос 6 — Storage на Vercel без дополнительной инфраструктуры

**Вердикт: первопартийного SQL/KV у Vercel больше НЕТ. Vercel Postgres и Vercel KV упразднены — их место занял Marketplace (Neon / Upstash / Supabase). Первопартийными остались только Blob и Global Config. Blob доступен на Hobby.**

Дока: https://vercel.com/docs/storage (last_updated **2026-09-03**), https://vercel.com/docs/marketplace-storage

| Продукт | Первопартийный? | Назначение | Планы |
|---|---|---|---|
| **Vercel Blob** | **Да** | файлы/объекты любого размера | Hobby, Pro |
| **Global Config** | **Да** | runtime-конфиг, feature flags. Чтение <1 мс, **запись — секунды** | Hobby, Pro, Ent |
| Marketplace storage | Нет (Neon/Upstash/Supabase/Mongo) | Postgres, Redis, NoSQL, vector | зависит от провайдера |

Ответ на «нужна ли отдельная регистрация в третьей стороне»:
- Формально **нет отдельного сайн-апа**: `vercel install neon` / `vercel install upstash` — одна команда, ставит интеграцию, привязывает к проекту, вытягивает креды в `.env.local`, «Vercel injects provisioned resource credentials as environment variables», биллинг через Vercel. Но юридически это ресурс третьей стороны, и Vercel так и пишет.
- **С нулевой сторонней зависимостью совсем — только Blob.**

В таблице сравнения Hobby/Pro в строке Storage указано ровно: Hobby — Blob, Pro — Blob (https://vercel.com/docs/plans/hobby). Никакого Postgres/KV в списке планов больше нет.

Включённое в Hobby (https://vercel.com/docs/plans/hobby): 1 000 000 вызовов функций, **4 CPU-hrs Active CPU**, 360 GB-hrs provisioned memory, 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer, Global Config — 100 000 чтений но **всего 100 записей**. Плюс: Hobby ограничен «non-commercial, personal use only» (fair use), для хакатона это ок.

**Рекомендация для нас:** заказы/транскрипты/метрики — JSON в **Vercel Blob**, ключ `sessions/<session_id>.json`. Ноль сторонних сервисов, ноль схемы, читается после сессии. Global Config не годится — 100 записей в месяц и запись секундами.

---

## Вопрос 7 — Python и FastAPI на Vercel

**Вердикт: FastAPI поддерживается как первоклассный preset, с zero-config, включая WebSocket. FastAPI можно сохранить. Но для варианта A выбор языка почти не важен — остаётся 5 коротких роутов.**

Дока: https://vercel.com/docs/functions/runtimes/python (last_updated 2026-08-12), https://vercel.com/docs/frameworks/backend/fastapi, гайд https://vercel.com/kb/guide/ship-a-fastapi-app-on-vercel

- Автодетект по `requirements.txt` / `pyproject.toml` / `Pipfile`. Entrypoint: `app.py`, `index.py`, `server.py`, `main.py`, `asgi.py` (или `src/`/`app/`), либо `tool.vercel.entrypoint = "my_package.api:app"`. Верхнеуровневая переменная должна называться `app`.
- Версии Python: **3.12 (дефолт), 3.13, 3.14**.
- Стриминг ответов — поддерживается, причём **включён по умолчанию** (https://vercel.com/changelog/python-vercel-functions-now-have-streaming-enabled-by-default).
- **WebSocket — да**, `@app.websocket(...)` без Vercel-специфичного API.
- Bundle: **500 МБ** для Python против 250 МБ для Node (то есть Python здесь щедрее), до 5 ГБ через Large Functions beta.
- max duration — **тот же самый**, что у Node (300/800/1800 с). Дискриминации нет.
- In-function concurrency (Fluid) — Python поддержан (https://vercel.com/changelog/python-support-added-to-in-function-concurrency-beta).

Минусы Python против Node на Vercel:
- Нет tree-shaking, бандлится всё достижимое → нужен `excludeFiles` в `vercel.json`.
- Next.js-фронтенд + FastAPI в одном проекте — через **Vercel Services** (https://vercel.com/docs/services), каждая часть билдится отдельно и роутится на общий домен. Это лишняя сущность.

**Итог по языку:** FastAPI сохранять можно и безболезненно. Но если фронтенд всё равно на Next.js, то держать питоновский сервис ради 5 роутов по 10 строк — оверхед; TypeScript API routes в том же Next.js-проекте будут путём наименьшего сопротивления. Если же уже есть написанная валидационная логика на Python — оставляйте FastAPI, доплаты по лимитам нет.

---

## Три варианта

| | **A. Всё на Vercel, браузер → AssemblyAI напрямую** | **B. Фронт на Vercel + отдельный always-on бэкенд** | **C. Vercel + inbound WS в функции (гибрид)** |
|---|---|---|---|
| Аудио-путь | браузер ↔ AssemblyAI (2 сокета, токены) | браузер ↔ наш бэкенд ↔ AssemblyAI | браузер ↔ Vercel Function ↔ AssemblyAI |
| Always-on сервис | **нет** | да (Fly/Railway/Render) | нет |
| Docker | **нет** | обычно да | нет |
| Серверный код | 5 коротких HTTPS-роутов | полноценный WS-прокси | WS-обработчик + роуты |
| `tool.call` | HTTP tools, AssemblyAI зовёт наш вебхук | наш код в сокете | наш код в сокете |
| Лимит длины сессии | **нет** (`max_session_duration_seconds` до 10800 с) | нет | **300 с Hobby / 800 с Pro** — 10-мин сессия рвётся на Hobby |
| Задержка | **минимальная** (нет лишнего хопа) | +1 хоп через наш регион | +1 хоп через `iad1` |
| Провенанс по словам | клиентский → **данные под контролем атакующего** | серверный, доверенный | серверный, доверенный |
| Latency-метрики | серверные через `GET /v1/sessions` (turn-level) + клиентские | полностью серверные, word-level | полностью серверные |
| Стоимость | в пределах Hobby | +$5-20/мес | Active CPU за обработку сообщений |
| Сложность деплоя | **одна команда `vercel`** | два деплоя, два конфига, CORS | один деплой, но бета-фича |
| Секреты | API-ключ только на сервере (токены короткоживущие) | ключ только на сервере | ключ только на сервере |
| Официально поддержано | **да, это канонический паттерн Vercel** | да (стандартно везде) | да, но **public beta** с июня 2026 |
| Что ломается | доверие к клиентским данным; HTTP tools требуют stored agent; отладка вебхука локально нужен туннель | лишний сервис, cold start/засыпание free-tier, два источника правды | обрыв по max duration; реконнект посреди сессии; беты |

---

## Вопрос по варианту A: провенанс и измерение задержки

**Провенанс по словам — работает, но перестаёт быть доверенным. Для хакатон-демо это не важно; для продакшена — важно.**

Механика не меняется: браузер получает `Turn`-сообщения с `words[]` и `start`/`end` по каждому слову от STT v3 напрямую, матчит текстовый хинт на span слов, крутит валидаторы, решает gate. Алгоритм тот же, исполнитель другой.

Что именно теряется:
- Провенанс, посчитанный в браузере, — это **attacker-controlled data**. Пользователь может открыть DevTools и отправить в `POST /api/session/finalize` любой `gate: "pass"` с любыми таймингами, не произнеся ни слова.
- Для демо на хакатоне это неважно: судьи смотрят, что система работает на честном входе, а не пытаются её ломать. Ни один жюри не откроет консоль, чтобы подделать word offsets.
- Если нужна страховка дешёвой ценой: делать gate-решение **серверным HTTP tool**. Браузер шлёт в вебхук распознанный span и хинт, сервер сам прогоняет валидаторы и возвращает outcome. Тогда подделать можно входные тайминги, но не логику решения — компромисс на одну функцию.
- Полностью доверенный провенанс требует, чтобы аудио шло через наш сервер, то есть варианта B или C. Это цена вопроса, и её надо платить только если модель угроз реально включает злонамеренного пользователя.

**Задержку измерить серверно — можно, но только на уровне реплик, не слов.**

По `GET /v1/sessions` и `GET /v1/sessions/{id}` (https://www.assemblyai.com/docs/voice-agents/voice-agent-api/session-history) доступны:
- список завершённых сессий (поллинг по `session_id`/`created_at`; **вебхука на завершение сессии в доке нет**),
- artifacts как short-lived pre-signed download URLs: аудио, timeline, метаданные,
- timeline с turn-level таймстемпами: начало/конец реплики агента, **`time_to_first_audio_ms`**,
- `duration_ms` по tool-вызовам — то есть **задержка нашего gate-вебхука измеряется серверно точно**.

Чего там нет: **word-level тайминги в session history отсутствуют** (только turn-level). То есть «сколько прошло от произнесённого слова до реакции» серверно из session history не восстанавливается — это придётся либо мерить в браузере и присылать (недоверенно, но для демо-графика достаточно), либо принять turn-level гранулярность.

Итог по метрикам в варианте A: `time_to_first_audio_ms` и латентность tool-вызовов — серверные и честные; word-to-gate — только клиентские.

---

## Рекомендация

**Да, задача целиком ложится на Vercel. Берите вариант A.**

Причины по порядку весомости:
1. Оба сокета AssemblyAI официально принимают короткоживущие токены в query-параметре — аудио-прокси не нужен как класс. Это не обходной путь, это документированный способ работы из браузера.
2. Voice Agent API умеет серверные HTTP tools: AssemblyAI сама POST-ит в наш эндпоинт. Значит per-turn серверная логика — это обычный короткий HTTPS-хендлер, ровно то, для чего serverless и создан.
3. Это тот же паттерн, который Vercel продвигает в AI SDK 7 realtime как канонический. Мы не воюем с платформой.
4. Снимается главный риск варианта C: сессия 2-10 минут против 300 с на Hobby. В варианте A `max_session_duration_seconds` до 10800 с, и потолок функции вообще ни при чём.
5. Storage — Vercel Blob, JSON на сессию. Ноль сторонних сервисов, влезает в Hobby.

Порядок работ:
1. `POST https://agents.assemblyai.com/v1/agents` со `system_prompt`, `voice` и tools с `http.url` на наш прод-домен. Сохранить `agent_id` в env. Один раз, `curl` в `Makefile`.
2. Два токен-роута (`/api/stt-token`, `/api/agent-token`) — по 10 строк.
3. `POST /api/tools/*` — вебхуки для HTTP tools. Помнить: только HTTPS и публичный хост, ответ ≤8 KiB, режим `interactive`, shared secret в write-only `http.headers`.
4. Браузер: два `WebSocket` с `?token=`, `session.update` с `agent_id`, PCM16 бинарём в STT и base64-в-JSON в агента.
5. Финализация сессии → JSON в Blob.

Что держать в голове:
- Локальная разработка HTTP tools требует туннеля (ngrok/cloudflared) — private/loopback хосты AssemblyAI блокирует. Проще тестировать на preview-деплое Vercel.
- Токены одноразовые: при реконнекте (в том числе `session.resume`) браузер обязан взять новый токен.
- Провенанс на клиенте недоверенный. Для демо — принять, отметить в презентации как известное ограничение с описанным путём к варианту B.

Вариант B оставить как план отхода — если внезапно понадобится доверенный word-level провенанс или честные word-to-gate метрики. Вариант C не рекомендую: даёт худшее из двух миров (бета-фича + лимит 300 с на Hobby ровно посреди нашего диапазона сессий) ради выгоды, которую вариант A получает без прокси.

---

## Сводка неподтверждённого

| Утверждение | Статус |
|---|---|
| Vercel Function может открыть исходящий WS к сторонему серверу | прямой цитаты в доке нет; выведено из «Full Node.js coverage» + Sandbox-гайда |
| WebRTC-терминация на Vercel | документации не найдено; считать отсутствующим |
| Вебхук на завершение сессии в Voice Agent API | в доке не упомянут; доки рекомендуют поллинг `GET /v1/sessions` |
| Точный таймаут HTTP tool по умолчанию | в доке помечен как конфигурируемый, конкретное значение не извлечено |
| Доступность Vercel Sandbox на Hobby и его цена | в гайде не указаны |
