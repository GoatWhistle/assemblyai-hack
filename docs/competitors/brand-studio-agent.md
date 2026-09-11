# Brand Studio Agent — Build Your Brand by Voice

**Тир:** A — Сильные  
**Чем силён:** Правильный async-паттерн tool.call → быстрый ответ → reply.create. Forced JSON в LLM Gateway. 40 коммитов  
**Где пробивается:** Сам помечает 3 из 5 слоёв как in progress/planned, а в питче описывает в present tense. Демо не отвечает

[← все конкуренты](../competitors.md)

---
Репо: `SingularityOS-AI/brand-studio-agent` · 40 коммитов · 0 звёзд · демо `https://brand.singularityos-ai.com` · слайды есть, видео нет.

**1. Что построено**

Голосовой «редактор с вкусом», который судит идею контента до записи: автор произносит идею (или заливает 10 минут неструктурированной болтовни), агент прогоняет её по письменной рубрике (есть ли «злодей», а не просто тема; заходит ли тема в первые 5 секунд; есть ли контринтуитивное утверждение; не пахнет ли машинным текстом; есть ли CTA) и выдаёт вердикт. Ниже 9/10 агент отказывается отдать сценарий — переопределение возможно только голосом и логируется. Заявленный второй контур: word-level STT над сырыми съёмками → edit decision list → рендер.

**2. Как использован AssemblyAI**

Самая грамотная по API-поверхности работа среди разобранных. README прямо заявляет: «**AssemblyAI carries three of the four legs.** Gemini covers only vision, which AssemblyAI does not offer». Конкретика:

- **Voice Agent API** — диалог, barge-in, tool calling через JSON-Schema; модель названа явно: `Universal-3 Pro`. Транспорт: WebSocket, `PCM16 mono 24 kHz, base64`.
- **LLM Gateway** — сам вердикт: «runs the verdict itself against a forced JSON schema, fed straight from `transcript_id`». Редкий и правильный ход: не тащить транскрипт в свой промпт, а подать `transcript_id` в шлюз.
- **Streaming STT** — word-level timestamps как основа edit decision list.
- **Асинхронная шина `reply.create`** — ключевая техническая идея: «a tool returns in under a second, the render runs in the background, and the backend later pushes `reply.create` so the agent tells you it is done — **without freezing the conversation**». Единственный проект среди разобранных, который вообще понимает проблему долгих tool-вызовов в голосовом агенте.
- Протокольные детали в разделе «Notes for anyone reading the code» выдают реальную работу руками: «Do not send `input.audio` before `session.ready`»; «On barge-in, flush the playback buffer immediately — on `input.speech.started`, not on `reply.done`. It feels roughly 300 ms snappier»; `new AudioContext({ sampleRate: 24000 })`, чтобы ничего не ресемплилось; Safari игнорирует sample rate и требует ручного ресемпла.

**3. Архитектура и стек**

Python 3.12 · FastAPI · WebAudio/AudioWorklet с аппаратным AEC · AssemblyAI (Voice Agent + Streaming STT + LLM Gateway) · Gemini 2.5 Flash-Lite через Vertex AI (`google-cloud-aiplatform>=1.70.0`) · FFmpeg. Хостинг — Render (`render.yaml`). Персистентность — Supabase (`supabase>=2.3.0`), аутентификация через Supabase Auth с проверкой JWT на бэкенде (`PyJWT`, `cryptography` для ES256 в тестах). Интересный слой, которого нет в README, но он есть в `requirements.txt`: `pytrends>=4.9.2` + `google-api-python-client` — «Demand Validation — Public Data Sources» (Google Trends + YouTube Data API), плюс в корне лежит `demo_demand.py`. Токены сделаны правильно: «The API key never reaches the browser. The server mints a short-lived token and the client passes it as `?token=` on the WebSocket URL» (`GET /api/token`).

**4. Настоящая инженерная суть**

Нетривиального три вещи. Первая — async-паттерн `tool.call` → быстрый ответ → фоновая задача → `reply.create`. Это то, на чём ломаются почти все голосовые агенты с тяжёлыми инструментами, и автор явно это спроектировал, а не наткнулся. Вторая — принудительная JSON-схема вердикта в LLM Gateway с обязательной цитатой: «Every score must quote the exact sentence that justifies it. **No citation, no score**». Это архитектурный анти-галлюцинационный контур, а не промпт-просьба. Третья — сам gate: продукт, который отказывается выдать результат и логирует голосовое переопределение, — дизайн-решение с зубами, судьи такое замечают.

Обёрткой является всё остальное: рубрика — это промпт, «Purity 0–99%» — произвольная шкала без калибровки, а Gemini-vision и рендер вообще не написаны.

**5. Метрики и доказательства**

Здесь проект и рушится, и одновременно выигрывает в честности. Есть таблица Status, где автор сам помечает: токен-минтинг ✅, браузерный клиент ✅, разговор с barge-in ✅, а **tool calling 🔨 in progress, `reply.create` 🔨 in progress, The Judge and the rubric 🔨 in progress, word-level STT → EDL 📋 planned, Render 📋 planned**. То есть три из четырёх «ног» AssemblyAI, вокруг которых построена вся презентация, на момент сабмита не работают. Прямая цитата: «This repository is the **foundation**, not the finished product».

Из цифр: единственная — «roughly 300 ms snappier» от раннего флаша буфера на `input.speech.started` (оценка на ощупь, не замер). Плюс сильный негативный аргумент против конкурентов-предсказателей виральности: «even models trained on 500 hours of fMRI recordings fail to forecast YouTube replay behaviour (r = +0.058, p = 0.23)» — ссылка на публикацию не дана, проверить нельзя, но риторически работает. Тесты: `pytest`, `pytest-asyncio`, `ruff` в зависимостях, папка `tests/` есть — объём и покрытие из README не видны.

**6. Сильные стороны**

Самая широкая и осмысленная эксплуатация платформы AssemblyAI среди разобранных (три разных продукта AssemblyAI + правильный async-протокол) — прямое попадание в Application of Technology. Originality: «агент, который отказывает» — незаезженная рамка, не очередной «ассистент-помощник». Presentation: README с mermaid-диаграммой, честной Status-таблицей и протокольными заметками читается как инженерный документ; есть живое демо и слайды. Business Value: боль сформулирована от первого лица и правдоподобно («I am a working interpreter who builds software at night… editing ate two hours per video»), позиционирование против «предсказателей просмотров» защищаемо.

**7. Слабые места и уязвимости**

- **Главное**: то, что демонстрируется в питче, по собственной таблице автора не реализовано. Судья, открывший README, увидит 🔨×3 и 📋×2. Питч на lablab описывает систему в present tense («The LLM Gateway **runs** the verdict… Streaming STT **produces** the word-level timestamps»), а репо говорит «in progress / planned». Это расхождение между сабмитом и кодом — самая болезненная точка.
- Видео нет (`"video": "н/д"`). Для голосового продукта, где вся ценность в петле «перебей агента и поспорь», отсутствие записи разговора — критический пробел в Presentation.
- Гигиена репозитория: в корне `ANALISIS_CRUZADO.html`, `LICENSE\` (битая запись), `RUN.bat`, `agent_mockup/` — «mockup» в корне намекает, что UI частично бутафория.
- Шкала «Purity 0–99%» необоснованна: почему не 0–100, почему порог 9/10, откуда веса — не объяснено. «Рубрика, которую я написал в январе» — приватный артефакт, не воспроизводимый третьей стороной.
- Команда из одного человека (Gabriel Jose Bustos Viloria), 40 коммитов — нормально, но при пяти незакрытых слоях выглядит как переобещание.
- Теги на lablab («Anthropic Claude, Gemini 3 Flash, Antigravity, Imagen») противоречат README, где Gemini «только vision», а Claude вообще не упомянут.

**8. Чем это можно побить**

Их козырь — асинхронный `reply.create` и LLM Gateway с forced JSON — и он у них не дописан. Ход: реализовать ровно эти два контура и **показать их в 30-секундном фрагменте видео с таймером на экране**: tool-вызов возвращается за <300 мс, разговор не прерывается, через N секунд агент сам заговаривает «готово». Плюс закрыть их уязвимость доказуемостью: если мы делаем оценочный/аудиторский контур, приложить воспроизводимый набор из 20–30 размеченных примеров и показать согласованность с человеческой разметкой (Cohen's κ) — тогда их «рубрика из января» и «Purity 0–99%» рядом с нашими числами читаются как вкусовщина. И обязательно видео: против проекта без видео его наличие само по себе выигрывает Presentation.

---
