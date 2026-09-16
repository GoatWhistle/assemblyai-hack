# Поле на 15 сентября 2026

Источник: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/live
Снимок сделан 15.09.2026, метка страницы `updated 21:50`. До конца хакатона: 14 дней 19 часов.

## Счётчики и динамика

| Метрика | 11 Sep | 15 Sep | Delta | Прирост «за сегодня» (с дашборда) |
|---|---|---|---|---|
| Participants | 2 765 | 3 083 | **+318** | ▲ +83 today |
| Teams | 720 | 840 | **+120** | ▲ +33 today |
| Submissions | 45 | **63** | **+18** | ▲ +8 today |
| Drafts in progress | н/д (не снимали) | 45 | н/д | ▲ +4 today |

**ВАЖНОЕ РАСХОЖДЕНИЕ (влияет на весь диff).** Счётчик говорит **63 сабмишена**, но блок «TOP SUBMISSIONS / By community vote» жёстко обрезан на **50 позициях**: все кнопки «Load more» я прожал до полного исчезновения (4 итерации подгрузки, далее кнопка кликается, но список не растёт — зафиксировано 15 пустых итераций), максимум — 50 уникальных ссылок. То есть **~13 сабмишенов не имеют публичной ссылки на этой странице**. Их названия частично видны в блоке LEADERBOARD (99 строк, ранги до 195, смесь сабмишенов и черновиков). Поэтому:

- список из 50 ссылок — **верифицирован**;
- 13 «невидимых» сабмишенов — **не верифицированы**, состав восстановлен только по названиям из лидерборда (без URL, без разделения «сабмишен vs черновик»).

Кандидаты в эти 13 (есть в лидерборде, отсутствуют в 50 ссылках) — *не подтверждено*:
`Voice Case - The Glasshouse, 03:40` (Ai-Q Labs), `OpsPilot Voice: AI Incident Commander` (SilverCrane), `Voice Language Partner`, `EvidenTurn`, `Voice Order Support Agent — interrupt it any time`, `SpokeUI: Point, Speak, Ship UI Changes`, `Clinic Scheduling Voice Agent`, `TechSəs: Voice IT Help Desk`, `SpeakToDebug`, `EduVoice CopilotAutoCopilot`, `HangON: AssemblyAI Voice Front Desk`, `Tareeq Al-Huda`, `Robin Voice Ops`, `Orion: Autonomous Bill Negotiation by Voice`, `VoiceDesk — AI voice front desk`.

### Технологии (20 tools, «Being used this round»)

AI/ML API 32 · Assistants API 21 · Anthropic Claude 18 · Vercel 17 · Antigravity 17 · Claude Code 16 · AgentOps 14 · rest api 13 · ChatGPT 13 · Gemini AI 12 · Codex 12 · Groq 9 · OpenAI 9 · Github Copilot 6 · AI Studio 6 · Gemini 3 Flash 6 · AMD Developer Cloud 5 · Whisper 5 · Redis 5 · AIML 5

(Счётчики «Codex» менялись на глазах между двумя чтениями страницы: 11 → 12. Дашборд живой.)

### Leaderboard top 10

| # | Билдер | Команда · Проект | Тир | Очки |
|---|---|---|---|---|
| 1 | HYACINTH ONCHANGU | KISII UNVERSITY CODE UNION · SAUTI AI: Voice-to-Action | NOVICE | 175 |
| 2 | Frantiesco Lucas | Frantal Company · Siberia Voice Agent | CONTRIBUTOR | 171 |
| 3 | Wei Liu | shinydatatech · KiaOra Dispatch | CONTRIBUTOR | 163 |
| 4 | Jayant Kumar | Twin MASTERS · MockMate — AI Voice Interview Coach | NOVICE | 163 |
| 5 | Sahariar Hossain | Sahariar-Dev · EchoExaminer | CONTRIBUTOR | 161 |
| 6 | ugyenrinzin158 | FarmVoice AI · FarmVoice - AI Voice Agent | NOVICE | 159 |
| 7 | Oussema Toumi | VoxSales AI Voice Agent · VoxSales AI Voice Agent | CONTRIBUTOR | 157 |
| 8 | GABRIEL JOSE BUSTOS VILORIA | VibeMarketing Studio · Brand Studio Agent | CONTRIBUTOR | 157 |
| 9 | yanero_rockstar274 | RevenueFlow · RevenueFlow: WhatsApp voice receptionist | NOVICE | 157 |
| 10 | Naman Anand | Ninjas · STICK | CONTRIBUTOR | 157 |

Очки почти плоские: с 12-го места и ниже — ровно 155 pts у всех. Ранжирование ниже топ-11 смысла не несёт.

## Новые сабмишены (7 верифицированных)

Из 45 известных на 11 Sep все 45 на месте. **Исчезнувших нет.** Два слуга (`techses-voice-it-help-desk`, `clinic-scheduling-voice-agent`) выпали из видимого списка 50, но их страницы живы — проверено HTTP-кодом:
- https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/techses/techses-voice-it-help-desk → **200**
- https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/clinic-scheduling-voice-agent/clinic-scheduling-voice-agent → **200**

Причина выпадения — обрезка списка на 50 и сортировка по голосам (у обоих 0 голосов), а не удаление.

Итого **7 новых с URL** (при заявленном приросте +18 — остальные 11 в невидимой части списка).

---

### 1. Second Chair (Enigma Pro) — самый сильный из новых

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/enigma-pro/second-chair
- GitHub: https://github.com/etisamhaq/assembly-voice-agent · Demo: https://second-chair-chi.vercel.app
- Теги: Groq, Assistants API, Anthropic Claude, Claude Code, Whisper

**Суть.** Комплаенс-суфлёр для разговоров на 3+ участников (советник + клиентская пара). Тезис: «Every voice agent assumes one human and one assistant. That assumption breaks the moment a third person is in the room». Живая диаризация, каждая финализированная реплика редактируется от PII и проверяется против пакета правил FINRA/SEC; при нарушении («guaranteed to return eight percent») предупреждение уходит **только в наушник советнику**, с номером регуляции и готовой заменой фразы.

**AssemblyAI (самая глубокая интеграция среди всех новых).** Явная таблица «AssemblyAI surface used»:
- Universal-Streaming v3 WebSocket (`app/sources/assemblyai.py`)
- модель **`universal-3-5-pro`** realtime
- **`speaker_labels` + `max_speakers`** — per-word labels → атрибуция доминирующего спикера
- **turn detection: `end_of_turn`, `end_of_turn_confidence`** — до комплаенса доходят только финализированные turns
- **LLM Gateway** как опциональный бэкенд на том же ключе (`app/llm.py`, `check_llm.py`)

**Измерения.** Есть раздел «Measured, not assumed», но измеряет он **скорость LLM-провайдеров**, а не аудиотракт: `check_llm.py` печатает таблицу (`openai/gpt-oss-120b` → tool_call, 235 ms; `gpt-oss-20b` → 456 ms; `qwen3.8-27b` → 439 ms). Латентность STT `~150ms p50` указана **в ASCII-схеме архитектуры без замерного стенда — это заявление, не измерение**. Бюджет `SC_WHISPER_LATENCY_BUDGET_MS=1000`, его превышения «counted and surfaced» — то есть инструментирование в рантайме есть.
Двухуровневая схема латентности осознана: «a regex cannot see an omitted risk disclosure, and an LLM cannot answer in 200 ms. So both run».

**Тесты/CI.** **132 теста, pytest, оффлайн** (`tests/test_addressivity.py`, `tests/test_pipeline.py`). Симулированный источник повторяет интерфейс живого, включая interim partials; тесты бегут 0.3 с. CI-бейджа не видно.

**Главная слабость.** Правила — pattern-based, и авторы сами признают: LLM-судья «reliably finds omitted risk disclosures» только на платном тире, «on the AssemblyAI free…» (обрезано). PII-редакция локальная и regex-овая. Домен — финансовый комплаенс, не медицина. Точность самого детектора нарушений не измерена ни на одном корпусе.

---

### 2. AegisOR (AegisTeam / testteam) — **прямая угроза Readback, см. раздел «Угрозы»**

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/testteam/aegisor
- GitHub: https://github.com/boycececil666gmailcom/AegisOR · Demo: https://huggingface.co/spaces/TyrionBao/AegisOR
- Теги: AI/ML API, Healthcare, Assistant

**Суть.** Ambient-платформа аудиокомплаенса операционной: проверка Universal Protocol перед разрезом (личность пациента, сторона/место операции, процедура, аллергии, согласие, антибиотикопрофилактика), отслеживание **closed-loop communication** внутри операции и документирование счёта салфеток/маркировки образцов после. FR-3 дословно: «Capture critical verbal directives (medication administrations, blood loss estimations, sponge/needle counts) and **match them against explicit verbal read-backs** to enforce closed-loop communication closure».

**AssemblyAI.** **Батч, не стриминг** — `aai.Transcriber().transcribe(...)` с `aai.TranscriptionConfig`. Параметры: `word_boost` (хирургический лексикон ~36 терминов) + `boost_param: "high"`, `speaker_labels: True`, `entity_detection: True`, опционально `summarization`/`auto_chapters`. Время берётся из `utterance.start/end` (мс → сек). **Voice Agent API не используется, streaming не используется, per-word confidence не читается, keyterms/LeMUR нет.**

**Измерения.** **Их нет.** NFR-1 заявляет «Audio chunk transcription p95 latency <= 500ms; closed-loop order-readback reconciliation latency p95 <= 250ms», NFR-2 — «99.99% operational uptime» — но это **требования в спецификации, а не результаты**: в репозитории нет бенчмарка, нет замерного скрипта, нет отчёта. Файлов всего ~13 в `src/`; `assembly_service.py` — 192 строки, `engine.py` — 391.

**Тесты.** Каталог `tests/` есть: `tests/unit/ut_engine.py`, `ut_models.py`, `ut_assembly_service.py`, `tests/integration/it_workflow.py`, запуск `uv run python -m unittest discover`. Количество не заявлено. CI-воркфлоу в дереве репозитория нет.

**Главная слабость — качество матчера read-back.** В `engine.py::match_closed_loop_orders` подтверждение ордера считается состоявшимся, если в одной из следующих 4 реплик есть **ЛИБО** одно слово из директивы длиннее 3 символов (`has_echo`), **ЛИБО** любое слово из списка `["given","pushed","administered","started","passed","here","confirm","done"]` (`has_affirm`). Условие — `if has_echo or has_affirm`. Следствие: на директиву «Administer 5000 units Heparin» ответ «**here**» помечает ордер `CONFIRMED`/`verified=True`. Дозировка и препарат не сверяются, числа не сверяются, уверенность распознавания не учитывается. Это ровно та ошибка, против которой построен Readback.

---

### 3. Heat Warning Agent (Heat Warning Agent / Ubaid Rehman)

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/heat-warning-agent/heat-warning-agent
- GitHub: https://github.com/ubaidai/heat-warning-agent · Demo: https://heat-warning-agent.vercel.app
- Теги: Vercel, AssemblyAI Voice Agent API, Claude Code, Anthropic Claude

**Суть.** Обзвон уличных работников при опасной жаре — с **проверкой понимания вместо подтверждения**. Ключевая идея, идеологически близкая Readback: «this agent never asks a question that "yes" can answer. It asks what the worker is going to do. It asks where they are going to sit». Инструмент записи результата «carries the worker's own words as evidence beside the judgement, so a reviewer can check the call rather than trust it» — то есть **есть провенанс в виде цитаты, но без таймкодов и без confidence**. «Нобody answered» — first-class исход, а не пропуск в данных.

**AssemblyAI.** Настоящий **Voice Agent API** (ссылка на `assemblyai.com/docs/voice-agents/voice-agent-api`), WebSocket-сессия, **tool-call loop**, 4 функции-инструмента, PCM16 @ 24 kHz, `sendAudio()` принимает base64 PCM16. `src/session.mjs` держит сокет, цикл tool-call и корректный teardown.

**Измерения.** Числовых метрик латентности/точности нет. Честно задокументировано ограничение: «AssemblyAI's streaming models cover 18 languages with native code-switching, and Urdu is not among them. Hindi is» — урду обслуживается хинди-моделью, и авторы прямо пишут, что «it needs testing against real Karachi speech before anyone relies on it». Демо-видео тоже честное: голос агента настоящий с живой сессии, ответы работника — TTS, и это объявлено в самом видео.

**Тесты.** **23 проверки** оффлайн, без ключа и микрофона: прогоняются все способы завершения звонка (confirmed, рефлекторное «да», cannot stop, distress, unanswered, полуотвеченный вопрос про воду).

**Главная слабость.** Языковая модель для урду — заведомая аппроксимация, не валидированная на реальной речи. Ни одного замера точности распознавания. Телефонная нога не входит в проект — нужен внешний перевозчик аудио.

---

### 4. VoiceDesk AI (Assembly Voice)

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/assembly-voice/voicedesk-ai
- GitHub: https://github.com/Javaid23/VoiceDesk-AI · Demo: https://voice-desk-7ua228z6x-javaidbutt009-9489s-projects.vercel.app/
- Теги: Next.js, Groq, Deepgram Aura, Silero, Beyond Presence, LiveKit, Anthropic Claude, Assistants API, ChatGPT

**Суть.** Звонок в поддержку к ИИ с фотореалистичным аватаром, который видит экран пользователя: STT + vision + reasoning вместо описаний проблемы словами. Может выполнять действия (разблокировка аккаунта) и присылает email-саммари. Модульная архитектура на LiveKit, каждый провайдер выбран независимо.

**AssemblyAI.** Только **streaming STT с end-of-turn detection** + «support vocabulary boost». Всё остальное — не AssemblyAI (TTS у Deepgram, VAD у Silero, LLM у Groq/Qwen 3.6 27B с отключённым reasoning «to keep latency low»).

**Измерения.** Только заявление «sub second response times». Цифр, персентилей, бенчмарков нет.

**Тесты/CI.** В README не обнаружены.

**Главная слабость.** AssemblyAI здесь — взаимозаменяемый компонент в стеке из 6 вендоров; ничего специфичного для аудио не сделано. Никаких гарантий корректности действий, которые агент выполняет от лица пользователя.

---

### 5. TalkOS (TalkOS / Sahil Sharma)

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/talkos/talkos
- GitHub: https://github.com/sahil-sharma-50/Talk-OS · Demo: https://talk-os-app.vercel.app/
- Теги: Codex, Vercel, GPT-5

**Суть.** Голосовой воркспейс: документы (Markdown, импорт PDF), таблицы (CSV/XLSX, формулы), планирование задач с детекцией конфликтов и экспортом в календарь, канвас, ресёрч-дашборд на Tavily, локальная персистентность с undo/redo. Акцент — на обработке перебиваний: «TalkOS cancels active work, rejects stale results, revises the task, and records the coordinated change as an undoable activity».

**AssemblyAI.** Realtime voice agents: `app/api/voice-token` обменивает ключ на короткоживущий session-токен, дальше браузер сам открывает realtime WebSocket. Нужен **Agent ID** — то есть Voice Agent API. Живые субтитры, interruption, mute, recovery.

**Измерения.** Нет ни одной метрики.

**Тесты/CI.** Лучшая инженерная гигиена среди новых: **Vitest + Testing Library + TypeScript + ESLint**, **GitHub Actions CI с бейджем** на `main`, `npm run check` = lint + types + tests + production build, требование проходить его до PR. Разумная политика секретов: прод игнорирует серверные ключи, если явно не выставлен `TALKOS_ALLOW_SERVER_CREDENTIALS=true`.

**Главная слабость.** Огромная поверхность продукта (7+ модулей) при нулевой глубине по голосу — голос лишь пульт к офисному пакету. Никакой предметной верификации, ничего проверяемого.

---

### 6. Voice-Controlled Robot Arm (vibes)

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/vibes/voice-controlled-robot-arm
- GitHub: https://github.com/shms1w/voice-robot-arm.git · Demo: тот же GitHub-URL
- Теги: Anthropic Claude, AssemblyAI, CoppeliaSim · Категории: Healthcare, Assistant

**Суть.** Хендс-фри подача инструментов для стерильных сред, в т.ч. операционной. Пять стадий: live-транскрипция AssemblyAI → NLU для определения инструмента → конечный автомат состояния манипулятора → замкнутый контур управления по фактическим углам сочленений → физическая симуляция в CoppeliaSim. Есть fuzzy-matching против несовершенной транскрипции и самокоррекция: задачу можно бросить на середине и запросить другой инструмент без ресета.

**AssemblyAI.** Только live-транскрипция (streaming STT). Специфичных фич не заявлено.

**Измерения.** Нет.

**Тесты/CI.** **Не проверить: README недоступен.** `raw.githubusercontent.com` вернул **404 и для `main`, и для `master`** — репозиторий приватный, пустой или переименован. Оценка сделана только по странице лаблаба. **Помечаю как неверифицированное.**

**Главная слабость.** Всё живёт в симуляторе (CoppeliaSim), железа нет. Плюс недоступный репозиторий — судьи не смогут посмотреть код по ссылке из сабмишена.

---

### 7. AegisVoice (MarksmanX)

- URL: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/marksmanx/aegisvoice
- GitHub: https://github.com/sulisumenpeter/AegisVoice · Demo: https://aegisvoice.vercel.app/
- Теги: AI/ML API, Antigravity, ChatGPT, Gemini AI · Категория: Finance

**Суть.** Голосовой слой для финансовых операций с разделением «намерение» и «авторизация». Девиз: **«Voice can request. Security decides.»** Zero-Trust Security Gateway: «The LLM is treated as an untrusted user-interface component. It can only *propose* a structured action». Бэкенд детерминированно проверяет RBAC, белые списки получателей, лимиты, риск-эвристики и выдаёт ALLOW / DENY / STEP_UP.

**Архитектурное родство с Readback — сильное, домен — другой.** Это ровно наш принцип «значение не входит в заказ, пока не прошло независимую проверку», но применённый к платежам, а не к назначениям. Валидаторы — политические (лимиты, RBAC), не структурные (mod-10, Luhn); провенанса на уровне слов, таймкодов и confidence нет.

**AssemblyAI.** Заявлен «AssemblyAI Realtime Voice Agent API» + «structured intent extraction». Есть документ `docs/05-API_CONTRACTS.md` про AssemblyAI Tools — то есть tool calling. Конкретных параметров (модель, confidence, тайминги) в README нет.

**Измерения.** Нет. README короткий (2 969 байт), это в основном навигация по 7 документам.

**Тесты/CI.** Заявлен `docs/06-TESTING.md` «Testing Strategy & Security Test Plan» и сид тестовых пользователей. Прогонов, количества тестов, CI — не видно.

**Главная слабость.** Документация опережает реализацию: 7 markdown-документов и ADR при почти отсутствующем содержательном README и без единого измерения. Голосовая часть — тонкая обёртка, вся ценность в гейтвее, который к голосу отношения не имеет.

---

## Изменения в топе по голосам

| # | Проект | Голоса 15 Sep |
|---|---|---|
| 01 | SAUTI AI: Voice-to-Action (KISII UNVERSITY CODE UNION) | 11 |
| 02 | Siberia Voice Agent (Frantal Company) | 9 |
| 03 | KiaOra Dispatch (shinydatatech) | 5 |
| 04 | MockMate — AI Voice Interview Coach (Twin MASTERS) | 5 |
| 05 | EchoExaminer (Sahariar-Dev) | 4 |
| 06 | FarmVoice - AI Voice Agent (FarmVoice AI) | 3 |
| 07 | STICK (Ninjas) | 2 |
| 08 | Liora (Bloodfang Ronin) | 2 |
| 09 | RevenueFlow: WhatsApp voice receptionist | 2 |
| 10 | Brand Studio Agent (VibeMarketing Studio) | 1 |

Состав и порядок топ-10 **идентичны снимку 11 Sep** — поголовных сдвигов не произошло. Поимённых значений голосов за 11 Sep у нас не сохранено, поэтому дельты по голосам посчитать нельзя (**помечаю как непроверяемое**).

Что стоит отметить:
- Голосование почти мёртвое. Порог входа в топ-25 — **1 голос**, позиции 26–50 имеют **0 голосов**. Наверху 11 голосов у лидера.
- Трое из семи новых уже зашли в верхнюю половину именно из-за этого: **Second Chair (21-е, 1 голос)**, **Heat Warning Agent (22-е, 1)**, **VoiceDesk AI (23-е, 1)**, **AegisOR (24-е, 1)**, **TalkOS (25-е, 1)**. Остальные два новых — Voice-Controlled Robot Arm (41-е) и AegisVoice (50-е) — с 0.
- Практический вывод: **2–3 голоса выводят проект в топ-10 по community vote**. Это дешёвый рычаг, и он одинаково доступен конкурентам.

## Угрозы для Readback

Критерии: (a) приём назначений/аптека, (b) провенанс и запись только после проверки, (c) списки LASA, (d) измерение Entity Error Rate или персентилей латентности.

### AegisOR — единственная прямая угроза. Близко по идее, слабо по реализации

| Критерий | AegisOR | Readback |
|---|---|---|
| (a) приём назначений | **Частично.** Не приём рецептов, а вербальные медикаментозные директивы в операционной («Administer 5000 units Heparin»). Домен пересекается: препарат + доза + подтверждение вслух. | Приём рецептов целиком |
| (b) запись только после проверки | **Заявлено, но подделка.** `verified=True` ставится по `has_echo OR has_affirm`. Ответа «here» достаточно. Доза и название не сверяются. Confidence распознавания не читается вовсе. | Значение не входит в заказ без валидатора или read-back |
| (c) LASA | **НЕТ.** Ни ISMP, ни FDA, ни look-alike/sound-alike — ни одного упоминания. Вместо этого `word_boost` из ~36 хирургических терминов. | Обязательный повторный вопрос при паре LASA даже на confidence 1.0 |
| (d) измерения | **НЕТ.** `p95 <= 500ms` и `p95 <= 250ms` — строки в разделе Non-Functional **Requirements**. Ни бенчмарка, ни отчёта, ни скрипта замера в репозитории. EER не упоминается. | — |
| Провенанс | Есть таймкоды уровня реплики (`utterance.start/end`, мс→сек) и speaker ID. **Нет пословных таймкодов и нет пословной уверенности.** | Пословный провенанс с ms-таймкодами + confidence на этих словах |
| Режим API | **Батч** `aai.Transcriber().transcribe()` — не стриминг, не Voice Agent API. Для интраоперационного гейтинга в реальном времени непригоден. | Realtime |

**Насколько близко на самом деле.** Опасен нарратив, не код: формулировка «match verbal medication orders against explicit read-backs to enforce closed-loop closure» на слух почти совпадает с нашей. Судья, читающий только README и слайды, может решить, что тема занята. Но три вещи разводят нас начисто: у них **батч вместо realtime**, **подтверждение по одному слову вместо сверки значения**, и **ноль измерений при заявленных p95**. Списка LASA нет вообще — а это и есть наше единственное неочевидное правило.

**Что делать.** Не избегать темы, а встать к ней вплотную: в демо показать ровно тот кейс, на котором их матчер ломается — директиву с дозой и ответ «here» / фонетически близкий препарат, — и рядом наш отказ с причиной. И обязательно **показать реальные замеры**: у AegisOR заявленные p95 не подкреплены ничем, поэтому наши настоящие персентили — прямое дифференцирующее преимущество, а не украшение.

### Косвенные, отслеживать

- **AegisVoice** — идентичный архитектурный принцип («LLM only proposes, gateway decides», ALLOW/DENY/STEP_UP), но домен финансовый, валидаторы политические, провенанса и LASA нет. Формулировку «Voice can request. Security decides.» стоит учесть: она сильнее нашей текущей подачи. Риск — не пересечение, а то, что они лучше объясняют общий принцип.
- **Heat Warning Agent** — самый близкий по *эпистемологии*: «никогда не задавать вопрос, на который можно ответить да», цитата слов пользователя как доказательство рядом с вердиктом, «никто не ответил» как полноценный исход. Домен (жара, уличные рабочие) не конкурирует, но идею «проверяем понимание, а не собираем подтверждение» они формулируют очень чисто и с 23 тестами.
- **Second Chair** — прямой конкурент не по домену, а по силе: единственный из новых, кто использует `speaker_labels`, `end_of_turn_confidence`, `universal-3-5-pro` и LLM Gateway, имеет 132 теста и раздел «Measured, not assumed». Претендент на призы в общем зачёте. Его слабое место — латентность STT `~150ms p50` в схеме тоже не измерена; измерены только LLM-провайдеры.
- **Voice-Controlled Robot Arm** — категория Healthcare, «closed-loop control», fuzzy-matching транскрипции, но это углы сочленений, а не значения полей. README недоступен (404). Мониторить.
- **Veritas Clinical AI**, **Voicemed-AI-Agent**, **Clinic Scheduling Voice Agent** — из старых 45, в этот заход не пересматривались; из них по названию ближе всего к рецептурному домену. Стоит перепроверить отдельно.
- **Невидимые ~13 сабмишенов** — главный непокрытый риск снимка. Среди названий из лидерборда есть `Voice Order Support Agent — interrupt it any time` и `ClaimVoice: AI Claims First-Responder`; получить их URL со страницы `/live` невозможно из-за обрезки на 50.

## Вывод

1. **Поле выросло резко, но поверхностно.** +18 сабмишенов за 4 дня (45 → 63, +40 %), участников +318, команд +120. При этом голосование практически стоит: 25 из 50 видимых проектов имеют 0 голосов, лидер — 11. Топ-10 не изменился вообще.
2. **Верифицировано только 7 новых сабмишенов из 18.** Список на `/live` жёстко обрезан на 50 позициях даже после исчерпания всех «Load more». Остальные 11 существуют по счётчику, но недостижимы по ссылкам — это дыра в снимке, а не отсутствие проектов.
3. **Прямая угроза одна — AegisOR, и она слабая.** Совпадение по нарративу (closed-loop read-back медикаментозных ордеров, медицинский лексикон, заявленные p95) при провале по существу: батч-транскрипция вместо realtime, подтверждение ордера по единственному слову вроде «here», отсутствие пословной уверенности, отсутствие LASA, ноль фактических измерений при заявленных требованиях p95.
4. **Наши три отличия по-прежнему не заняты никем.** Ни один из 7 новых не использует списки LASA (ISMP/FDA), ни один не измеряет Entity Error Rate, ни один не публикует персентили латентности по факту — только требования (AegisOR) или схемы (Second Chair). Пословный провенанс с ms-таймкодами плюс confidence на этих словах не делает никто.
5. **Где нас реально могут обойти — не в идее, а в исполнении.** Second Chair (132 теста, глубокие фичи AssemblyAI, раздел «Measured, not assumed») и TalkOS (CI с бейджем, Vitest, `npm run check` как гейт для PR) задают планку инженерной подачи. Readback должен превзойти их именно там, где у всех пусто: **настоящие измеренные числа** — персентили латентности и EER на фиксированном наборе, с воспроизводимым скриптом в репозитории.
6. **Дешёвый рычаг.** Порог топ-10 по голосам — 2 голоса. Стоит закрыть этот вопрос, пока он стоит так мало.
