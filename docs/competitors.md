# Конкуренты: тирлист и разбор

45 сабмишенов на 11 сентября 2026. Из них 21 разобран технически по README, структуре репозитория, зависимостям и коммитам — это те, кто реально борется за 5 призовых мест. Остальные 24 — в [полном каталоге](competitors-catalog.md).

Тир — это не качество продукта, а **степень угрозы для нас**: насколько трудно обойти этот проект по четырём критериям судейства.

## Тирлист

### Тир S — Прямая угроза

Борются за те же призовые места. Их придётся обойти по существу, а не по оформлению.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[Saakshi](competitors/saakshi.md)** | Единственный полноценный соперник: 418 тестов, p50 1368 мс, три поверхности API, hash-chain, judge-solo | Основной LLM — Groq, не LLM Gateway. Precision 1.00 на самоправленой выборке 70 реплик. Хеши без соли. 11 коммитов |
| **[VoiceMed AI](competitors/voicemed-ai.md)** | Единственный, кто использует Voice Agent API строго по спецификации: tool queue по reply.done, execution_mode hold, ring-buffer barge-in. 44 теста | 5,63 с до приветствия — единственное измеренное число. Turn-to-turn не измерен. База: 20 симптомов, 20 взаимодействий |

### Тир A — Сильные

Есть настоящая инженерия или настоящая идея, но у каждого одна крупная дыра.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[The claim intake agent that refuses to guess](competitors/claim-intake.md)** | Лучший обобщаемый инсайт: keyterms уничтожают независимость наблюдения. 30 коммитов | Доказательство n=3 плюс «my recollection». Аудио не сохранено. Ни одной метрики латентности |
| **[Voice Action Gate](competitors/voice-action-gate.md)** | Лучшая идея хакатона: capability вместо if, witness строится до появления предложения | Живой путь браузер→WS→гейт не прогонялся ни разу. Агент — regex. READ_BACK_CONFIRMED не реализован. 7 коммитов |
| **[Voxrede](competitors/voxrede.md)** | Две сбриджованные Voice Agent сессии. Лучший инсайт поля про API: turn detection измеряет тишину в потоке, разрыв потока ≠ тишина. 29 коммитов, CI | Тестирует собственные фикстуры. Демо — статический архив. n=2, одна из двух атак не воспроизвелась |
| **[Officer Parker](competitors/officer-parker.md)** | Лучшая глубина Voice Agent API: один WebSocket (Universal-3 Pro + LLM + neural turn detection + TTS) + LLM Gateway на claude-sonnet-5 | Сам признаёт деградацию главной функции на free-tier. Chrome-only. Нет персистентности |
| **[Brand Studio Agent](competitors/brand-studio-agent.md)** | Правильный async-паттерн tool.call → быстрый ответ → reply.create. Forced JSON в LLM Gateway. 40 коммитов | Сам помечает 3 из 5 слоёв как in progress/planned, а в питче описывает в present tense. Демо не отвечает |
| **[Radio Universe: Radio You Can Talk To](competitors/radio-universe.md)** | Технически крепкий: Cloudflare Durable Object, jitter-буферы 280/120 мс, монотонные часы. Единственный, где голос — сам продукт | 5 коммитов. Нет Business Value (сам пишет про «next validation targets»). Нет замеров end-to-end. Нет модерации эфира |

### Тир B — Крепкие

Сделано аккуратно, но нет доказательной базы или нет глубины API.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[Second Listen](competitors/second-listen.md)** | Сильнейший Business Value (VC/PE, риск-реестр). 47 коммитов | Форк официального starter-репо AssemblyAI. Universal-2 вместо 3.5. Ноль тестов, ноль метрик |
| **[VerbaTrace AI](competitors/verbatrace-ai.md)** | Эксплуатационная зрелость: 5 условий перед выдачей токена, Durable Object как источник правды, resume после refresh | Только Streaming STT, нет Voice Agent API и TTS. README противоречит заявке. 1,6 MB бандлов в репо |
| **[MockMate](competitors/mockmate.md)** | 11 фич Voice Agent API, включая редкие transcription_prompt, session.resume, transcript.agent.delta | Ноль тестов, ноль цифр. Продаёт некалиброванный LLM-балл как hire signal |
| **[Uh-Huh: A Voice Agent for Busy-Handed Workers](competitors/uh-huh.md)** | Лучшая доказательная дисциплина: 66/66 тестов, live receipts, keyless офлайн-демо за 60 с. Нашёл реальный баг модели («uh-huh» → «Aha») | Не использует Voice Agent API вообще. Windows-only TTS. Клиент — по сути клип. 2 коммита. Демо не отвечает |
| **[Aura](competitors/aura.md)** | Лучшая архитектурная идея: PGlite (WASM Postgres) как детерминированный слой истины, --max-old-space-size=256 | Ноль собственных замеров. Парсер 10-K не валидирован против источника — при питче «без галлюцинаций». Демо не отвечает |

### Тир C — Слабые при хорошей идее

Идея есть, исполнение или демо подводит.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[Readdy AI](competitors/readdy-ai.md)** | 38 коммитов, 5 продуманных промптов-персонажей, конечный автомат интервью | Демо = приватный дашборд Vercel. Папки tests/ не существует. Нулевая техническая глубина, модель не названа |
| **[Voice Lab](competitors/voice-lab.md)** | Детерминированное вычисление симметрии молекул с верификацией | В репо LIVEKIT_MIGRATION.md — голосовой транспорт уезжает с AssemblyAI. 3 молекулы. ~17 MD-файлов при 4 коммитах |
| **[Liora](competitors/liora.md)** | Паттерн draft_change как обязательный шаг подтверждения. Хорошая презентация со скриншотами | README указывает legacy v2/realtime/ws, который не отдаёт ни tool calls, ни TTS — прямое противоречие заявке. localStorage как единственное хранилище. Инструмент get_creator_info в продуктовом наборе |
| **[RevenueFlow: WhatsApp voice receptionist](competitors/revenueflow.md)** | 51 коммит, сильный бизнес-кейс (WhatsApp, LatAm, SMB) | Это не голосовой агент: нет TTS, нет turn detection, ответы — шаблоны. 8 тестов в README против 177 на девпосте |

### Тир D — Переоценённые

Высоко по голосам сообщества или по объёму кода, но инженерия не подтверждается.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[SAUTI AI: Voice-to-Action](competitors/sauti-ai.md)** | #1 по голосам сообщества (11) | README 1010 символов целиком про миграции Supabase, слово «AssemblyAI» не встречается ни разу. Теги заявки не подтверждаются package.json. Суахили не поддержан |
| **[Siberia Voice Agent](competitors/siberia-voice-agent.md)** | #2 по голосам (8). Широчайшая площадь API на бумаге: REST POST /v1/agents, server-side HTTP tools, keyterms из БЗ | 5 коммитов. Нет composer.json — репозиторий не запускается вообще. Ядро SaaS проприетарно и вне репо |
| **[SmartLink Voice: Autonomous Analytics Voice Agent](competitors/smartlink.md)** | 56 коммитов, самый большой объём кода (3,5 MB) | Слова «AssemblyAI» в README нет вообще. Голосовой код в ветке voice-agent-demo. В корне Codester_Icon.jpg — следы купленного шаблона. Ноль тестов |

### Тир F — Дисквалифицирующие себя

Проблемы, которые судья заметит сразу и которые обнуляют доверие к остальному.

| Проект | Чем силён | Где пробивается |
|---|---|---|
| **[Veritas Clinical AI](competitors/veritas-clinical-ai.md)** | Лучшая презентация поля по оформлению | Все бенчмарки взаимно противоречивы («18 мин → 1,2 с» подписано «92% Reduction»). Loom ведёт на сам репозиторий, Live Demo — на localhost:3000. README обрывается на полуслове. Отключены safety-фильтры Gemini без медицинского дисклеймера |

---

## Пять сквозных выводов

### 1. Измеренной латентности нет почти ни у кого

Единственное исключение — Saakshi: p50 1368 мс, max 1538 мс, воспроизводимо командой `pnpm test:e2e:latency`. Все остальные пишут «sub-second», «under 300ms», «real-time» без процентилей и методики. У VoiceMed единственное измеренное число — 5,63 с до приветствия, и turn-to-turn они не мерили.

AssemblyAI при этом сама публикует целевые пороги ([assemblyai-signals.md](assemblyai-signals.md)): finalization delay P95 < 500 мс, TTS TTFB < 300 мс, end-to-end < 1 с, и требует репортить P50/P95/P99. **Это открытая категория — таблица процентилей забирает её целиком.**

### 2. Тестов почти нет, CI нет ни у кого

Реальная тестовая база у двух: Saakshi (418 юнит-тестов + Playwright с fake mic через `SAAKSHI_FAKE_WAV`) и Uh-Huh (66/66 + `receipts/LIVE_RECEIPT.md`). У большинства ноль. Работающего CI по теме нет ни у одного из 45 — единственная папка `.github` нашлась в репозитории, который вообще не относится к проекту.

### 3. Лидеры по голосам инженерно слабейшие

| Место | Проект | Голоса | Что в репозитории |
|---|---|---|---|
| #1 | SAUTI AI | 11 | README 1010 символов про миграции Supabase. Слово «AssemblyAI» не встречается ни разу |
| #2 | Siberia Voice Agent | 8 | 5 коммитов, нет `composer.json`, репозиторий не запускается. Ядро SaaS вне репо |

Голоса не входят в критерии судейства (прямая оговорка на странице: «Points do not affect submission evaluation»). Лидер имеет 11 голосов, десятое место — 1. Топ-рефереры (9, 7, 6 приглашённых) не сдали ни одного проекта. **Раскрутка здесь почти ничего не даёт.**

### 4. Расхождение заявки и кода — массовое явление

| Проект | Расхождение |
|---|---|
| Liora | Заявляет Voice Agent API, указывает legacy `wss://api.assemblyai.com/v2/realtime/ws`, который не отдаёт ни tool calls, ни TTS |
| Brand Studio Agent | Сам помечает 3 из 5 ключевых слоёв как in progress / planned, в питче описывает в present tense |
| VerbaTrace | В заявке «agent responses and tool-driven actions» через AssemblyAI, в README этого нет |
| Voice Lab | В репозитории `LIVEKIT_MIGRATION.md` — голосовой транспорт уезжает с AssemblyAI |
| SmartLink | Слова «AssemblyAI» в README нет вообще, голосовой код в отдельной ветке |
| RevenueFlow | 8 тестов в README против 177 на девпосте; 7 с против 10 с |

### 5. Часть громких цифр сфабрикована

У Veritas Clinical AI бенчмарки взаимно противоречивы: «18 минут → 1,2 секунды» подписано как «92% Reduction». Loom-ссылка ведёт на собственный репозиторий, «Live Demo» — на `localhost:3000`, README обрывается на середине слова. Отключены safety-фильтры Gemini без медицинского дисклеймера.

**Вывод, меняющий тактику: честность здесь — конкурентное преимущество, а не гигиена.** Числа с командой воспроизведения и явный раздел «чего нет и что не измерено» на этом фоне читаются как единственная заслуживающая доверия работа. Saakshi выиграл доверие ровно этим — сам назвал свою оценку «regression suite, not a generalisation estimate».

---

## Что это значит для нас

Планка ниже, чем кажется по числу сабмишенов. Обойти поле можно не экзотикой, а дисциплиной:

| Что сделать | Почему это работает |
|---|---|
| Работающее демо не на бесплатном Render | 12 из 45 теряют очки на мёртвой ссылке ([demo-health.md](demo-health.md)) |
| Измеренная латентность P50/P95/P99 | Есть у одного из 45 |
| CI с зелёным бейджем | Нет ни у одного из 45 |
| Held-out метрика, а не регрессионная выборка | Даже Saakshi честно признал, что у него регрессия |
| Точное соответствие заявки и кода | Минимум 6 проектов на этом подставились |
| Judge-solo режим | Судья один, без второго говорящего, возможно без микрофона |

Подробно — [strategy.md](strategy.md).

## Детальные разборы

По файлу на проект, каждый по восьми пунктам: что построено, как использован AssemblyAI, архитектура, настоящая инженерная суть, метрики и доказательства, сильные стороны, уязвимости, чем побить.

**Тир S:** [Saakshi](competitors/saakshi.md), [VoiceMed AI](competitors/voicemed-ai.md)

**Тир A:** [The claim intake agent that refuses to guess](competitors/claim-intake.md), [Voice Action Gate](competitors/voice-action-gate.md), [Voxrede](competitors/voxrede.md), [Officer Parker](competitors/officer-parker.md), [Brand Studio Agent](competitors/brand-studio-agent.md), [Radio Universe: Radio You Can Talk To](competitors/radio-universe.md)

**Тир B:** [Second Listen](competitors/second-listen.md), [VerbaTrace AI](competitors/verbatrace-ai.md), [MockMate](competitors/mockmate.md), [Uh-Huh: A Voice Agent for Busy-Handed Workers](competitors/uh-huh.md), [Aura](competitors/aura.md)

**Тир C:** [Readdy AI](competitors/readdy-ai.md), [Voice Lab](competitors/voice-lab.md), [Liora](competitors/liora.md), [RevenueFlow: WhatsApp voice receptionist](competitors/revenueflow.md)

**Тир D:** [SAUTI AI: Voice-to-Action](competitors/sauti-ai.md), [Siberia Voice Agent](competitors/siberia-voice-agent.md), [SmartLink Voice: Autonomous Analytics Voice Agent](competitors/smartlink.md)

**Тир F:** [Veritas Clinical AI](competitors/veritas-clinical-ai.md)
